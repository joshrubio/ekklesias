import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const notice =
    error === "sin-acceso"
      ? "Tu cuenta no tiene acceso a ninguna iglesia. Pide al administrador que te invite."
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Acceso al panel</h1>
      <p className="text-sm text-muted">Solo para administradores y líderes.</p>
      <LoginForm notice={notice} />
    </main>
  );
}
