import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/mailer";
import { memberLink, parseQrSource, qrResponse } from "@/lib/qr";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(request: Request, ctx: RouteContext<"/admin/qr/miembro/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("No encontrado", { status: 404 });

  const session = await getAdminSession();
  const supabase = await createUserClient();
  const { data: member } = await supabase
    .from("members")
    .select("invite_code, status")
    .eq("id", id)
    .eq("tenant_id", session.tenant.id)
    .maybeSingle();
  if (!member || member.status !== "active") {
    return new Response("No encontrado", { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  return qrResponse({
    text: memberLink(await getSiteUrl(), member.invite_code, parseQrSource(params.get("s"))),
    format: params.get("format"),
    download: params.get("download") === "1",
    filename: `ekklesias-${member.invite_code}`,
  });
}
