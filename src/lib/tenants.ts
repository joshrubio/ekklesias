import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formPurposes, type FormConsent, type FormPurpose } from "@/lib/consents";
import type { Locale } from "@/i18n/config";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  brand_color: string;
  accent_color: string | null;
  font: string;
  theme_mode: string;
  logo_path: string | null;
  contact_email: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function safeBrand(color: string): string {
  return HEX_COLOR.test(color) ? color : "#0f766e";
}

export const getTenantBySlug = cache(async (slug: string) => {
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, slug, name, brand_color, accent_color, font, theme_mode, logo_path, contact_email")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Tenant | null) ?? null;
});

export async function getInviter(code: string) {
  const { data } = await createAdminClient()
    .from("members")
    .select("first_name, tenant_id")
    .eq("invite_code", code)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const row = data as { first_name: string | null; tenant_id: string };

  const { data: tenant } = await createAdminClient()
    .from("tenants")
    .select("id, slug, name, brand_color, accent_color, font, theme_mode, logo_path, contact_email")
    .eq("id", row.tenant_id)
    .maybeSingle();
  if (!tenant) return null;
  return { firstName: row.first_name ?? "", tenant: tenant as Tenant };
}

type TextRow = {
  purpose: FormPurpose;
  locale: string;
  version: number;
  body: string;
  is_required: boolean;
};

export async function getConsentTexts(
  tenantId: string,
  locale: Locale,
): Promise<FormConsent[]> {
  const { data } = await createAdminClient()
    .from("consent_texts")
    .select("purpose, locale, version, body, is_required")
    .eq("tenant_id", tenantId)
    .in("locale", [locale, "es"]);

  const rows = (data as TextRow[] | null) ?? [];
  const result: FormConsent[] = [];

  for (const purpose of formPurposes) {
    const candidates = rows.filter((r) => r.purpose === purpose);
    const preferred = candidates
      .filter((r) => r.locale === locale)
      .sort((a, b) => b.version - a.version)[0];
    const fallback = candidates
      .filter((r) => r.locale === "es")
      .sort((a, b) => b.version - a.version)[0];
    const chosen = preferred ?? fallback;
    if (chosen) {
      result.push({
        purpose,
        text: chosen.body,
        required: chosen.is_required,
      });
    }
  }
  return result;
}
