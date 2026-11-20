"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestMeta } from "@/lib/request-meta";
import { allowByIp } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenants";
import { TOKEN_RE, optionalPurposes } from "@/lib/consents";

export type PreferencesState = { status?: "saved" | "error" | "limited" };

export async function savePreferencesAction(
  token: string,
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  if (!TOKEN_RE.test(token)) return { status: "error" };
  if (!(await allowByIp("preferences"))) return { status: "limited" };

  const shown = String(formData.get("shown") ?? "").split(",");
  const consents = optionalPurposes
    .filter((p) => shown.includes(p))
    .map((purpose) => ({
      purpose,
      granted: formData.get(`consent_${purpose}`) === "on",
    }));

  const meta = await getRequestMeta();
  const { error } = await createAdminClient().rpc("apply_preferences", {
    p_token: token,
    p_consents: consents,
    p_user_agent: meta.userAgent,
    p_ip_hash: meta.ipHash,
  });
  return { status: error ? "error" : "saved" };
}

export async function unsubscribeAction(token: string) {
  if (!TOKEN_RE.test(token)) redirect("/baja/invalido");
  if (!(await allowByIp("unsubscribe"))) redirect(`/baja/${token}?error=limite`);
  const meta = await getRequestMeta();
  const { error } = await createAdminClient().rpc("unsubscribe_member", {
    p_token: token,
    p_user_agent: meta.userAgent,
    p_ip_hash: meta.ipHash,
  });
  redirect(error ? `/baja/${token}?error=1` : "/baja/hecho");
}

const rightsTypes = [
  "access",
  "rectification",
  "erasure",
  "portability",
  "objection",
] as const;

export type RightsState = { error?: "email" | "type" | "server" | "rate" };

export async function rightsRequestAction(
  slug: string,
  _prev: RightsState,
  formData: FormData,
): Promise<RightsState> {
  if (String(formData.get("website") ?? "") !== "") redirect(`/derechos/${slug}/enviado`);

  if (!(await allowByIp("rights"))) return { error: "rate" };

  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const type = String(formData.get("type") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "email" };
  if (!(rightsTypes as readonly string[]).includes(type)) return { error: "type" };

  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "server" };

  const { error } = await createAdminClient().rpc("create_rights_request", {
    p_tenant: tenant.id,
    p_email: email,
    p_type: type,
    p_notes: notes || null,
  });
  if (error) return { error: "server" };

  redirect(`/derechos/${slug}/enviado`);
}
