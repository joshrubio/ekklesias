import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl, sendMail } from "@/lib/mailer";
import { isLocale, defaultLocale, dirFor, type Locale } from "@/i18n/config";
import es from "../../messages/es.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import ar from "../../messages/ar.json";

const texts: Record<Locale, typeof es.emails.guardian> = {
  es: es.emails.guardian,
  en: en.emails.guardian,
  de: de.emails.guardian,
  ar: ar.emails.guardian,
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Crea un enlace nuevo para el tutor (anula los anteriores) y se lo envía en el idioma del
 * menor. Devuelve false si no hay tutor pendiente o si el correo no se pudo enviar.
 */
export async function sendGuardianEmail(memberId: string): Promise<boolean> {
  const db = createAdminClient();

  const { data: member } = await db
    .from("members")
    .select("first_name, locale, tenant_id, guardians(full_name, email)")
    .eq("id", memberId)
    .eq("status", "active")
    .maybeSingle();
  const guardian = Array.isArray(member?.guardians) ? member.guardians[0] : member?.guardians;
  if (!member || !guardian) return false;

  const { data: tenant } = await db
    .from("tenants")
    .select("name, contact_email")
    .eq("id", member.tenant_id)
    .maybeSingle();
  if (!tenant) return false;

  const { data: token, error } = await db.rpc("create_guardian_token", {
    p_member: memberId,
  });
  if (error || !token) return false;

  const locale = isLocale(member.locale) ? member.locale : defaultLocale;
  const t = texts[locale];
  const link = `${await getSiteUrl()}/tutor/confirmar/${token}`;
  const values = {
    guardian: guardian.full_name,
    minor: member.first_name ?? "",
    church: tenant.name,
    contact: tenant.contact_email,
    link,
    days: "14",
  };

  const lines = [
    fill(t.greeting, values),
    fill(t.body, values),
    fill(t.action, values),
    link,
    fill(t.expires, values),
    fill(t.ignore, values),
    fill(t.controller, values),
  ];

  const html = `<div dir="${dirFor(locale)}" style="font-family:system-ui,sans-serif;line-height:1.5;max-width:36rem">
<p>${escapeHtml(lines[0])}</p>
<p>${escapeHtml(lines[1])}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">${escapeHtml(fill(t.button, values))}</a></p>
<p style="color:#555;font-size:14px">${escapeHtml(lines[4])}<br>${escapeHtml(lines[5])}</p>
<p style="color:#555;font-size:14px">${escapeHtml(lines[6])}</p>
</div>`;

  return sendMail({
    to: guardian.email,
    subject: fill(t.subject, values),
    text: lines.join("\n\n"),
    html,
  });
}
