import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteUserForm, UserRowActions } from "@/components/users-admin";

const messages: Record<string, string> = {
  yo: "No puedes cambiar tu propio rol ni quitarte a ti mismo.",
  ultimo: "La iglesia necesita al menos un administrador.",
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    return <p className="text-muted">Solo los administradores gestionan usuarios.</p>;
  }

  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const saved = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;

  const supabase = await createUserClient();
  const { data: rows } = await supabase
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", session.tenant.id)
    .order("created_at");

  const { data: list } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
  const emails = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Usuarios del panel</h1>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {messages[error] ?? "Algo ha fallado."}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {saved === "rol" ? "Rol actualizado." : "Usuario eliminado."}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              <th className="px-3 py-2 text-start font-medium">Email</th>
              <th className="px-3 py-2 text-start font-medium">Rol</th>
              <th className="px-3 py-2 text-start font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.user_id} className="border-t border-black/10 align-top dark:border-white/15">
                <td className="px-3 py-3">{emails.get(r.user_id) ?? "—"}</td>
                <td className="px-3 py-3">{r.role === "admin" ? "Administrador" : "Líder"}</td>
                <td className="px-3 py-3">
                  <UserRowActions
                    userId={r.user_id}
                    role={r.role as "admin" | "leader"}
                    isSelf={r.user_id === session.userId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Añadir usuario</h2>
        <p className="text-sm text-muted">
          Se crea la cuenta con una contraseña temporal que verás una sola vez. Un líder solo
          ve a los miembros que aceptaron la visibilidad; un administrador lo ve todo.
        </p>
        <InviteUserForm />
      </section>
    </main>
  );
}
