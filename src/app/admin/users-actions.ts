"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const roles = ["admin", "leader"] as const;

async function requireAdmin() {
  const session = await getAdminSession();
  if (session.role !== "admin") throw new Error("Solo administradores");
  return session;
}

function tempPassword() {
  return randomBytes(12).toString("base64url");
}

export type CredentialState = {
  email?: string;
  password?: string;
  error?: string;
};

export async function inviteUserAction(
  _prev: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const session = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(formData.get("role") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un email válido." };
  if (!(roles as readonly string[]).includes(role)) return { error: "Elige un rol." };

  const password = tempPassword();
  const created = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    return { error: "No se pudo crear la cuenta. Puede que ese email ya tenga una." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.from("tenant_users").insert({
    tenant_id: session.tenant.id,
    user_id: created.data.user.id,
    role,
  });
  if (error) {
    await createAdminClient().auth.admin.deleteUser(created.data.user.id);
    return { error: "No se pudo dar acceso a la iglesia." };
  }

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "invite_user",
    entity: "user",
    entity_id: created.data.user.id,
    metadata: { role },
  });

  revalidatePath("/admin/usuarios");
  return { email, password };
}

async function memberOfTenant(userId: string, tenantId: string) {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function resetPasswordAction(
  userId: string,
  _prev: CredentialState,
): Promise<CredentialState> {
  const session = await requireAdmin();
  if (!UUID.test(userId) || !(await memberOfTenant(userId, session.tenant.id))) {
    return { error: "Usuario no válido." };
  }
  const password = tempPassword();
  const admin = createAdminClient();
  const { data: user, error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error || !user.user) return { error: "No se pudo restablecer la contraseña." };

  const supabase = await createUserClient();
  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "reset_password",
    entity: "user",
    entity_id: userId,
  });
  return { email: user.user.email ?? "", password };
}

export async function changeRoleAction(userId: string, formData: FormData) {
  const session = await requireAdmin();
  const role = String(formData.get("role") ?? "");
  if (!UUID.test(userId) || !(roles as readonly string[]).includes(role)) return;
  if (userId === session.userId) redirect("/admin/usuarios?error=yo");

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("tenant_users")
    .update({ role })
    .eq("tenant_id", session.tenant.id)
    .eq("user_id", userId);
  if (error) redirect("/admin/usuarios?error=ultimo");

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "change_role",
    entity: "user",
    entity_id: userId,
    metadata: { role },
  });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?saved=rol");
}

export async function removeUserAction(userId: string) {
  const session = await requireAdmin();
  if (!UUID.test(userId)) return;
  if (userId === session.userId) redirect("/admin/usuarios?error=yo");

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("tenant_id", session.tenant.id)
    .eq("user_id", userId);
  if (error) redirect("/admin/usuarios?error=ultimo");

  await createAdminClient().auth.admin.deleteUser(userId);

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "remove_user",
    entity: "user",
    entity_id: userId,
  });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?saved=quitado");
}

export type PasswordState = { status?: "ok" | "short" | "mismatch" | "error" };

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await getAdminSession();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 12) return { status: "short" };
  if (password !== repeat) return { status: "mismatch" };

  const supabase = await createUserClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { status: error ? "error" : "ok" };
}
