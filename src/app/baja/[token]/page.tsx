import { getTranslations } from "next-intl/server";
import { unsubscribeAction } from "@/lib/member-actions";
import { TOKEN_RE } from "@/lib/consents";

export const metadata = { robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  params,
  searchParams,
}: PageProps<"/baja/[token]">) {
  const { token } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("unsubscribe");

  if (error === "limite") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tooManyTitle")}</h1>
        <p className="text-muted">{t("tooManyBody")}</p>
      </main>
    );
  }

  if (!TOKEN_RE.test(token) || error) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("invalidTitle")}</h1>
        <p className="text-muted">{t("invalidBody")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted">{t("body")}</p>
      <form action={unsubscribeAction.bind(null, token)}>
        <button
          type="submit"
          className="w-full rounded-md bg-brand px-5 py-4 text-lg font-medium text-white sm:w-auto"
        >
          {t("confirm")}
        </button>
      </form>
    </main>
  );
}
