"use server";

import { isFontKey, isHex, isThemeMode } from "@/lib/theme";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { formPurposes, requiredGroup } from "@/lib/consents";
import { isLocale } from "@/i18n/config";

async function requireAdmin() {
  const session = await getAdminSession();
  if (session.role !== "admin") throw new Error("Solo administradores");
  return session;
}

export async function updateChurchAction(formData: FormData) {
  const session = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const color = String(formData.get("brand_color") ?? "").trim();
  const email = String(formData.get("contact_email") ?? "").trim().slice(0, 200);
  const accentSame = formData.get("accent_same") === "on";
  const accent = String(formData.get("accent_color") ?? "").trim();
  const font = String(formData.get("font") ?? "");
  const mode = String(formData.get("theme_mode") ?? "");

  if (!name) redirect("/admin/ajustes?error=nombre");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) redirect("/admin/ajustes?error=color");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/admin/ajustes?error=email");
  if (!accentSame && !isHex(accent)) redirect("/admin/ajustes?error=color");
  if (!isFontKey(font)) redirect("/admin/ajustes?error=fuente");
  if (!isThemeMode(mode)) redirect("/admin/ajustes?error=modo");

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      brand_color: color,
      accent_color: accentSame ? null : accent,
      font,
      theme_mode: mode,
      contact_email: email,
    })
    .eq("id", session.tenant.id);
  if (error) redirect("/admin/ajustes?error=guardar");

  revalidatePath("/", "layout");
  redirect("/admin/ajustes?saved=iglesia");
}

export async function publishTextAction(formData: FormData) {
  const session = await requireAdmin();

  const purpose = String(formData.get("purpose") ?? "");
  const locale = String(formData.get("locale") ?? "");
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  const back = `/admin/ajustes?purpose=${encodeURIComponent(purpose)}&locale=${encodeURIComponent(locale)}`;

  if (!(formPurposes as readonly string[]).includes(purpose) || !isLocale(locale)) {
    redirect("/admin/ajustes?error=texto");
  }
  if (body.length < 20 || body.length > 4000) redirect(`${back}&error=longitud`);

  const supabase = await createUserClient();
  const { data: latest } = await supabase
    .from("consent_texts")
    .select("version, body, is_required")
    .eq("tenant_id", session.tenant.id)
    .eq("purpose", purpose)
    .eq("locale", locale)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.body.trim() === body) redirect(`${back}&error=igual`);

  const { error } = await supabase.from("consent_texts").insert({
    tenant_id: session.tenant.id,
    purpose,
    locale,
    body,
    version: (latest?.version ?? 0) + 1,
    is_required: latest?.is_required ?? (requiredGroup as readonly string[]).includes(purpose),
  });
  if (error) redirect(`${back}&error=guardar`);

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "publish_consent_text",
    entity: "consent_text",
    metadata: { purpose, locale, version: (latest?.version ?? 0) + 1 },
  });

  redirect(`${back}&saved=texto`);
}
