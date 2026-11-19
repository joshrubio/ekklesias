import { getAdminSession } from "@/lib/admin-session";
import {
  cleanSearch,
  listMembers,
  parsePurpose,
  purposeLabels,
} from "@/lib/admin-members";
import { formPurposes } from "@/lib/consents";
import { createUserClient } from "@/lib/supabase/server";

function cell(value: string | number | boolean | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    return new Response("Solo administradores", { status: 403 });
  }

  const url = new URL(request.url);
  const q = cleanSearch(url.searchParams.get("q") ?? undefined);
  const purpose = parsePurpose(url.searchParams.get("consent") ?? undefined);

  const { members, granted } = await listMembers({
    tenantId: session.tenant.id,
    q,
    purpose,
  });

  const header = [
    "Nombre",
    "Apellidos",
    "Email",
    "Móvil",
    "Fecha de nacimiento",
    "Dirección",
    "Bautizado",
    "Idioma",
    "Origen",
    "Alta",
    ...formPurposes.map((p) => purposeLabels[p]),
  ];
  const rows = members
    .filter((m) => m.status === "active")
    .map((m) => [
      m.first_name,
      m.last_name,
      m.email,
      m.phone,
      m.birth_date,
      m.address,
      m.baptized === null ? "" : m.baptized ? "Sí" : "No",
      m.locale,
      m.registered_via,
      m.registered_at.slice(0, 10),
      ...formPurposes.map((p) => (granted.get(m.id)?.has(p) ? "Sí" : "No")),
    ]);

  const csv =
    "﻿" +
    [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") +
    "\r\n";

  const supabase = await createUserClient();
  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "export_csv",
    entity: "members",
    metadata: { rows: rows.length, q, consent: purpose },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miembros-${session.tenant.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
