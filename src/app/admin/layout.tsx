import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { safeBrand } from "@/lib/tenants";
import { logoutAction } from "@/app/login/actions";

export const metadata = { title: "Panel · Ekklesias" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getAdminSession();

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-12 sm:px-6"
      style={{ "--brand": safeBrand(session.tenant.brand_color) } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3 dark:border-white/15">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/admin" className="font-semibold">
            {session.tenant.name}
          </Link>
          <Link href="/admin/miembros" className="underline-offset-4 hover:underline">
            Miembros
          </Link>
        </nav>
        <form action={logoutAction} className="flex items-center gap-3 text-sm text-muted">
          <span>
            {session.email} · {session.role === "admin" ? "Administrador" : "Líder"}
          </span>
          <button type="submit" className="underline">
            Salir
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
