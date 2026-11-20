"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowByIp } from "@/lib/rate-limit";
import { TOKEN_RE } from "@/lib/consents";

async function answer(token: string, fn: "confirm_guardian" | "reject_guardian") {
  if (!TOKEN_RE.test(token)) redirect("/tutor/confirmar/invalido");
  if (!(await allowByIp("guardian"))) redirect(`/tutor/confirmar/${token}?error=limite`);

  const { error } = await createAdminClient().rpc(fn, { p_token: token });
  if (error) redirect(`/tutor/confirmar/${token}?error=1`);
  redirect(`/tutor/confirmar/${token}`);
}

export async function confirmGuardianAction(token: string) {
  await answer(token, "confirm_guardian");
}

export async function rejectGuardianAction(token: string) {
  await answer(token, "reject_guardian");
}
