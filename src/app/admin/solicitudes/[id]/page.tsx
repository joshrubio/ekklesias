import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { updateRequestAction } from "@/app/admin/actions";
import { requestStatusLabels, requestTypeLabels } from "@/lib/admin-requests";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function RequestPage({
  params,
}: PageProps<"/admin/solicitudes/[id]">) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const session = await getAdminSession();
  if (session.role !== "admin") notFound();

  const supabase = await createUserClient();
  const { data: r } = await supabase
    .from("rights_requests")
    .select("id, requester_email, type, status, received_at, due_at, resolved_at, notes, member_id")
    .eq("id", id)
    .eq("tenant_id", session.tenant.id)
    .maybeSingle();
  if (!r) notFound();

  const type = r.type as keyof typeof requestTypeLabels;
  const canExport = r.member_id && (type === "access" || type === "portability");

  return (
    <main className="flex flex-col gap-6">
      <Link href="/admin/solicitudes" className="text-sm underline">
        ← Solicitudes
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {requestTypeLabels[type]} · {r.requester_email}
      </h1>
      <dl className="flex flex-col gap-1 text-sm">
        <div>Recibida: {new Date(r.received_at).toLocaleString("es-ES")}</div>
        <div>Plazo de respuesta: {new Date(r.due_at).toLocaleDateString("es-ES")}</div>
        <div>
          Estado: {requestStatusLabels[r.status as keyof typeof requestStatusLabels]}
        </div>
        <div>
          Miembro:{" "}
          {r.member_id ? (
            <Link href={`/admin/miembros/${r.member_id}`} className="underline">
              ver ficha
            </Link>
          ) : (
            "ningún miembro activo usa ese email (verifica la identidad antes de actuar)"
          )}
        </div>
      </dl>

      {r.member_id && type === "erasure" ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Antes de suprimir, comprueba que quien pide es la persona titular. La supresión se
          hace desde su ficha.
        </p>
      ) : null}
      {canExport ? (
        <a
          href={`/admin/solicitudes/${r.id}/datos`}
          className="self-start rounded-md border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25"
        >
          Descargar sus datos (JSON)
        </a>
      ) : null}

      <form action={updateRequestAction.bind(null, r.id)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Estado
          <select
            name="status"
            defaultValue={r.status}
            className="rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25"
          >
            {Object.entries(requestStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Notas internas
          <textarea
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={r.notes ?? ""}
            className="rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25"
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-brand px-4 py-2 text-base font-medium text-white"
        >
          Guardar
        </button>
      </form>
    </main>
  );
}
