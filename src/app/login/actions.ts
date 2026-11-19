"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
