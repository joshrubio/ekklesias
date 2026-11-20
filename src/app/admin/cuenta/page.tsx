import { getAdminSession } from "@/lib/admin-session";
import { PasswordForm } from "@/components/password-form";

export default async function AccountPage() {
  const session = await getAdminSession();
  return (
    <main className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
      <p className="text-sm text-muted">{session.email}</p>
      <PasswordForm />
    </main>
  );
}
