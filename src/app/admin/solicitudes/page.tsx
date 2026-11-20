import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { requestStatusLabels, requestTypeLabels } from "@/lib/admin-requests";

export default async function RequestsPage() {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    return <p className="text-muted">Solo los administradores gestionan solicitudes.</p>;
  }
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("rights_requests")
    .select("id, requester_email, type, status, received_at, due_at, member_id")
    .eq("tenant_id", session.tenant.id)
    .order("status")
    .order("due_at");

  const now = Date.now();

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de derechos</h1>
      {!data || data.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/20 p-6 text-center text-muted dark:border-white/25">
          No hay solicitudes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr>
                <th className="px-3 py-2 text-start font-medium">Tipo</th>
                <th className="px-3 py-2 text-start font-medium">Email</th>
                <th className="px-3 py-2 text-start font-medium">Estado</th>
                <th className="px-3 py-2 text-start font-medium">Plazo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const open = r.status === "received" || r.status === "in_progress";
                const days = Math.ceil((new Date(r.due_at).getTime() - now) / 864e5);
                return (
                  <tr key={r.id} className="border-t border-black/10 dark:border-white/15">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/solicitudes/${r.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {requestTypeLabels[r.type as keyof typeof requestTypeLabels]}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {r.requester_email}
                      {!r.member_id ? (
                        <span className="ms-2 text-xs text-muted">(sin miembro)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {requestStatusLabels[r.status as keyof typeof requestStatusLabels]}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {open ? (
                        days < 0 ? (
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Vencida hace {-days} d
                          </span>
                        ) : (
                          `${days} d`
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
