"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function requireAdmin() {
  const session = await getAdminSession();
  if (session.role !== "admin") throw new Error("Solo administradores");
  return session;
}

export type LinkState = { url?: string; error?: string };

export async function createLinkAction(
  memberId: string,
  kind: "preferences" | "unsubscribe",
  _prev: LinkState,
): Promise<LinkState> {
  await requireAdmin();
  if (!UUID.test(memberId)) return { error: "Miembro no válido." };

  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("create_preference_token", {
    p_member: memberId,
    p_kind: kind,
    p_hours: kind === "preferences" ? 168 : 24 * 30,
  });
  if (error || !data) return { error: "No se pudo generar el enlace." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const path = kind === "preferences" ? "preferencias" : "baja";
  return { url: `${proto}://${host}/${path}/${data}` };
}

export async function eraseMemberAction(memberId: string, formData: FormData) {
  await requireAdmin();
  if (!UUID.test(memberId)) throw new Error("Miembro no válido");
  if (formData.get("confirm") !== "on") return;

  const supabase = await createUserClient();
  const { error } = await supabase.rpc("erase_member", { m: memberId });
  if (error) throw new Error("No se pudo suprimir al miembro");

  revalidatePath("/admin", "layout");
  redirect("/admin/miembros");
}

const statuses = ["received", "in_progress", "resolved", "rejected"] as const;

export async function updateRequestAction(requestId: string, formData: FormData) {
  const session = await requireAdmin();
  if (!UUID.test(requestId)) throw new Error("Solicitud no válida");

  const status = String(formData.get("status") ?? "");
  if (!(statuses as readonly string[]).includes(status)) return;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);
  const done = status === "resolved" || status === "rejected";

  const supabase = await createUserClient();
  await supabase
    .from("rights_requests")
    .update({
      status,
      notes: notes || null,
      resolved_at: done ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .eq("tenant_id", session.tenant.id);

  revalidatePath("/admin/solicitudes");
  redirect("/admin/solicitudes");
}
