import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { purposeLabels } from "@/lib/admin-members";
import { formPurposes } from "@/lib/consents";

export default async function AdminHome() {
  const session = await getAdminSession();
  const supabase = await createUserClient();

  const { count: active } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", session.tenant.id)
    .eq("status", "active");

  const { data: consents } = await supabase
    .from("member_consents_effective")
    .select("purpose")
    .eq("tenant_id", session.tenant.id)
    .eq("granted", true);

  const counts = new Map<string, number>();
  for (const c of consents ?? []) {
    counts.set(c.purpose, (counts.get(c.purpose) ?? 0) + 1);
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
      <p className="text-lg">
        <strong>{active ?? 0}</strong> miembros activos.{" "}
        <Link href="/admin/miembros" className="underline">
          Ver la lista
        </Link>
      </p>
      {session.role === "admin" ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Permisos concedidos</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {formPurposes.map((p) => (
              <li
                key={p}
                className="flex justify-between rounded-md border border-black/10 px-3 py-2 dark:border-white/15"
              >
                <span>{purposeLabels[p]}</span>
                <span className="font-medium">{counts.get(p) ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">
          Como líder solo ves a los miembros que han aceptado ser visibles.
        </p>
      )}
    </main>
  );
}
