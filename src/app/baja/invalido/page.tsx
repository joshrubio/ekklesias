import { getTranslations } from "next-intl/server";

export default async function InvalidUnsubscribePage() {
  const t = await getTranslations("unsubscribe");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t("invalidTitle")}</h1>
      <p className="text-muted">{t("invalidBody")}</p>
    </main>
  );
}
