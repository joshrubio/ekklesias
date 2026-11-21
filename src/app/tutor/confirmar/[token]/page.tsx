import { tenantStyle } from "@/lib/theme";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_RE } from "@/lib/consents";
import { getTenantBySlug } from "@/lib/tenants";
import { confirmGuardianAction, rejectGuardianAction } from "@/lib/guardian-actions";

export const metadata = { robots: { index: false, follow: false } };

type Request = {
  minor_first_name: string;
  tenant_name: string;
  tenant_slug: string;
  guardian_name: string;
  relationship: string;
  status: "pending" | "confirmed" | "rejected";
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted">{body}</p>
    </main>
  );
}

export default async function GuardianConfirmPage({
  params,
  searchParams,
}: PageProps<"/tutor/confirmar/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const t = await getTranslations("guardianPage");

  if (!TOKEN_RE.test(token)) {
    return <Message title={t("invalidTitle")} body={t("invalidBody")} />;
  }

  const { data } = await createAdminClient().rpc("get_guardian_request", { p_token: token });
  const req = data as Request | null;
  if (!req) return <Message title={t("invalidTitle")} body={t("invalidBody")} />;

  const values = { minor: req.minor_first_name };
  if (req.status === "confirmed") {
    return <Message title={t("confirmedTitle")} body={t("confirmedBody", values)} />;
  }
  if (req.status === "rejected") {
    return <Message title={t("rejectedTitle")} body={t("rejectedBody")} />;
  }

  const tenant = await getTenantBySlug(req.tenant_slug);

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12"
      style={tenantStyle(tenant)}
    >
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg">
        {t("ask", {
          church: req.tenant_name,
          minor: req.minor_first_name,
          guardian: req.guardian_name,
          relationship: req.relationship,
        })}
      </p>
      <p className="text-sm text-muted">{t("data")}</p>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error === "limite" ? t("tooMany") : t("invalidBody")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={confirmGuardianAction.bind(null, token)}>
          <button
            type="submit"
            className="w-full rounded-full bg-brand glow-btn px-5 py-4 text-lg font-semibold text-brand-foreground"
          >
            {t("confirm")}
          </button>
        </form>
        <form action={rejectGuardianAction.bind(null, token)}>
          <button
            type="submit"
            className="w-full rounded-md border border-border px-5 py-4 text-lg font-medium"
          >
            {t("reject")}
          </button>
        </form>
      </div>
    </main>
  );
}
