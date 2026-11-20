"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestMeta } from "@/lib/request-meta";
import { allowByIp } from "@/lib/rate-limit";
import { sendGuardianEmail } from "@/lib/guardian-mail";
import { getConsentTexts, getTenantBySlug } from "@/lib/tenants";
import {
  parseSource,
  requiredGroup,
  type FormPurpose,
} from "@/lib/consents";
import { isLocale, defaultLocale } from "@/i18n/config";

export type RegisterState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
  formError?: string;
};

function normalizePhone(raw: string): string {
  let value = raw.replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = "+" + value.slice(2);
  if (/^[6-9][0-9]{8}$/.test(value)) value = "+34" + value;
  return value;
}

function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  if (date > new Date() || date < new Date("1900-01-01T00:00:00Z")) return null;
  return date;
}

function isUnder14(birth: Date): boolean {
  const limit = new Date();
  limit.setUTCFullYear(limit.getUTCFullYear() - 14);
  return birth > limit;
}

const schema = z.object({
  firstName: z.string().trim().min(1, "required").max(80, "required"),
  lastName: z.string().trim().min(1, "required").max(120, "required"),
  email: z.string().trim().toLowerCase().pipe(z.email("email")),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => /^\+[0-9]{8,15}$/.test(v), "phone"),
  birthDate: z.string().refine((v) => parseBirthDate(v) !== null, "birthDate"),
  address: z.string().trim().max(200, "required"),
});

export async function registerAction(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const text = (key: string) => String(formData.get(key) ?? "");

  if (text("website") !== "") redirect("/gracias");

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "website") values[key] = value;
  }

  if (!(await allowByIp("register"))) return { values, formError: "rateLimit" };

  const tenant = await getTenantBySlug(text("tenantSlug"));
  if (!tenant) return { values, formError: "server" };

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const source = parseSource(text("source"));
  const inviterCode = text("inviterCode") || null;

  const errors: Record<string, string> = {};

  const parsed = schema.safeParse({
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    birthDate: text("birthDate"),
    address: text("address"),
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      errors[field] ??= issue.message;
    }
  }

  const birth = parseBirthDate(text("birthDate"));
  const minor = birth ? isUnder14(birth) : false;

  let guardian: { full_name: string; email: string; relationship: string } | null =
    null;
  if (minor) {
    const guardianEmail = z.email().safeParse(text("guardianEmail").trim());
    if (
      !text("guardianName").trim() ||
      !guardianEmail.success ||
      !text("guardianRelationship").trim() ||
      text("guardianConfirm") !== "on"
    ) {
      errors.guardian = "guardian";
    } else {
      guardian = {
        full_name: text("guardianName").trim().slice(0, 160),
        email: guardianEmail.data,
        relationship: text("guardianRelationship").trim().slice(0, 80),
      };
    }
  }

  let discoveredAlone = false;
  let invitedByText: string | null = null;
  if (!inviterCode) {
    const how = text("how");
    if (how === "discovered") discoveredAlone = true;
    else if (how === "invited") invitedByText = text("invitedByName").trim().slice(0, 120) || null;
    else errors.how = "required";
  }

  const available = await getConsentTexts(tenant.id, locale);
  const consents = available.map((c) => ({
    purpose: c.purpose,
    granted: text(`consent_${c.purpose}`) === "on",
  }));
  for (const purpose of requiredGroup) {
    const entry = consents.find((c) => c.purpose === (purpose as FormPurpose));
    if (!entry || !entry.granted) errors[`consent_${purpose}`] = "consent";
  }

  if (Object.keys(errors).length > 0) {
    return { values, errors, formError: "form" };
  }

  const baptizedRaw = text("baptized");
  const baptized = baptizedRaw === "yes" ? true : baptizedRaw === "no" ? false : null;

  const meta = await getRequestMeta();

  const data = parsed.data!;
  const { data: code, error } = await createAdminClient().rpc("register_member", {
    p_tenant: tenant.id,
    p_inviter_code: inviterCode,
    p_invited_by_text: invitedByText,
    p_discovered_alone: discoveredAlone,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_email: data.email,
    p_phone: data.phone,
    p_birth_date: text("birthDate"),
    p_address: data.address || null,
    p_baptized: baptized,
    p_locale: locale,
    p_source: source,
    p_guardian: guardian,
    p_consents: consents,
    p_user_agent: meta.userAgent,
    p_ip_hash: meta.ipHash,
  });

  if (error) {
    if (error.code === "23505") redirect("/gracias");
    if (error.message.includes("required_consent_missing")) {
      return { values, errors: { consent_membership: "consent" }, formError: "form" };
    }
    if (error.message.includes("guardian_required")) {
      return { values, errors: { guardian: "guardian" }, formError: "form" };
    }
    console.error("register_member failed:", error.code, error.message);
    return { values, formError: "server" };
  }

  if (guardian) {
    const { data: member } = await createAdminClient()
      .from("members")
      .select("id")
      .eq("invite_code", code as string)
      .maybeSingle();
    const sent = member ? await sendGuardianEmail(member.id) : false;
    redirect(`/gracias/${code as string}?tutor=${sent ? "sent" : "failed"}`);
  }

  redirect(`/gracias/${code as string}`);
}
