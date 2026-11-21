"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { LOGO_BUCKET, MAX_LOGO_BYTES, sniffLogo } from "@/lib/logo";

async function requireAdmin() {
  const session = await getAdminSession();
  if (session.role !== "admin") throw new Error("Solo administradores");
  return session;
}

export async function uploadLogoAction(formData: FormData) {
  const session = await requireAdmin();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/ajustes?error=logo-vacio");
  if (file.size > MAX_LOGO_BYTES) redirect("/admin/ajustes?error=logo-tamano");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffLogo(bytes);
  if (!type) redirect("/admin/ajustes?error=logo-tipo");

  const supabase = await createUserClient();
  const { data: current } = await supabase
    .from("tenants")
    .select("logo_path")
    .eq("id", session.tenant.id)
    .single();

  const path = `${session.tenant.id}/${randomUUID()}.${type.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });
  if (uploadError) redirect("/admin/ajustes?error=logo-subida");

  const { error } = await supabase
    .from("tenants")
    .update({ logo_path: path })
    .eq("id", session.tenant.id);
  if (error) {
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    redirect("/admin/ajustes?error=logo-subida");
  }

  if (current?.logo_path) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logo_path]);
  }

  revalidatePath("/", "layout");
  redirect("/admin/ajustes?saved=logo");
}

export async function removeLogoAction() {
  const session = await requireAdmin();
  const supabase = await createUserClient();

  const { data: current } = await supabase
    .from("tenants")
    .select("logo_path")
    .eq("id", session.tenant.id)
    .single();

  const { error } = await supabase
    .from("tenants")
    .update({ logo_path: null })
    .eq("id", session.tenant.id);
  if (error) redirect("/admin/ajustes?error=logo-subida");

  if (current?.logo_path) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logo_path]);
  }

  revalidatePath("/", "layout");
  redirect("/admin/ajustes?saved=logo");
}
