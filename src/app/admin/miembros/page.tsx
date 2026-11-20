import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import {
  ageFrom,
  cleanSearch,
  listMembers,
  parsePurpose,
  purposeLabels,
} from "@/lib/admin-members";
import { formPurposes } from "@/lib/consents";

export default async function MembersPage({
  searchParams,
}: PageProps<"/admin/miembros">) {
  const session = await getAdminSession();
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const purpose = parsePurpose(sp.consent);

  const { members, granted, pendingGuardian } = await listMembers({
    tenantId: session.tenant.id,
    q,
    purpose,
  });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (purpose) exportParams.set("consent", purpose);

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Miembros</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Buscar
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, email o móvil"
            className="rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25"
          />
        </label>
        {session.role === "admin" ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Ha aceptado
            <select
              name="consent"
              defaultValue={purpose ?? ""}
              className="rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25"
            >
              <option value="">Cualquier permiso</option>
              {formPurposes.map((p) => (
                <option key={p} value={p}>
                  {purposeLabels[p]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white"
        >
          Filtrar
        </button>
        {session.role === "admin" ? (
          <a
            href={`/admin/miembros/export?${exportParams.toString()}`}
            className="rounded-md border border-black/20 px-4 py-2 text-base dark:border-white/25"
          >
            Exportar CSV
          </a>
        ) : null}
      </form>

      <p className="text-sm text-muted">
        {members.length} {members.length === 1 ? "miembro" : "miembros"}
      </p>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/20 p-6 text-center text-muted dark:border-white/25">
          No hay miembros con estos criterios.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
          <table className="w-full text-start text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr>
                <th className="px-3 py-2 text-start font-medium">Nombre</th>
                <th className="px-3 py-2 text-start font-medium">Contacto</th>
                <th className="px-3 py-2 text-start font-medium">Alta</th>
                <th className="px-3 py-2 text-start font-medium">Origen</th>
                {session.role === "admin" ? (
                  <th className="px-3 py-2 text-start font-medium">Permisos</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const age = ageFrom(m.birth_date);
                const given = granted.get(m.id);
                return (
                  <tr
                    key={m.id}
                    className="border-t border-black/10 dark:border-white/15"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/miembros/${m.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {m.status === "erased"
                          ? "(suprimido)"
                          : `${m.first_name} ${m.last_name}`}
                      </Link>
                      {age !== null && age < 14 ? (
                        <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                          {pendingGuardian.has(m.id) ? "tutor sin confirmar" : "menor"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div>{m.email}</div>
                      <div className="text-muted">{m.phone}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(m.registered_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-3 py-2 uppercase">{m.registered_via}</td>
                    {session.role === "admin" ? (
                      <td className="px-3 py-2 text-muted">
                        {given
                          ? formPurposes
                              .filter((p) => given.has(p))
                              .map((p) => purposeLabels[p])
                              .join(", ")
                          : "—"}
                      </td>
                    ) : null}
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
