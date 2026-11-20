import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/admin/solicitudes/[id]/datos">,
) {
  const { id } = await ctx.params;
  const session = await getAdminSession();
  if (session.role !== "admin" || !uuid.test(id)) {
    return new Response("No autorizado", { status: 403 });
  }

  const supabase = await createUserClient();
  const { data: req } = await supabase
    .from("rights_requests")
    .select("member_id")
    .eq("id", id)
    .eq("tenant_id", session.tenant.id)
    .maybeSingle();
  if (!req?.member_id) return new Response("Sin miembro", { status: 404 });

  const [member, guardian, consents] = await Promise.all([
    supabase
      .from("members")
      .select(
        "first_name, last_name, email, phone, birth_date, address, baptized, locale, registered_via, registered_at, invited_by_text",
      )
      .eq("id", req.member_id)
      .single(),
    supabase
      .from("guardians")
      .select("full_name, email, relationship")
      .eq("member_id", req.member_id)
      .maybeSingle(),
    supabase
      .from("consent_events")
      .select("purpose, granted, source, given_by_guardian, recorded_at")
      .eq("member_id", req.member_id)
      .order("recorded_at"),
  ]);

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "export_member_data",
    entity: "member",
    entity_id: req.member_id,
  });

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      member: member.data,
      guardian: guardian.data,
      consents: consents.data,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datos-${session.tenant.slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
