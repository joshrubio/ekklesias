import { getAdminSession } from "@/lib/admin-session";
import { getSiteUrl } from "@/lib/mailer";
import { churchLink, parseQrSource, qrResponse } from "@/lib/qr";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (session.role !== "admin") return new Response("No autorizado", { status: 403 });

  const params = new URL(request.url).searchParams;
  return qrResponse({
    text: churchLink(await getSiteUrl(), session.tenant.slug, parseQrSource(params.get("s"))),
    format: params.get("format"),
    download: params.get("download") === "1",
    filename: `ekklesias-${session.tenant.slug}`,
  });
}
