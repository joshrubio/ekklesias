import { getTranslations } from "next-intl/server";

export default async function ThanksGeneric() {
  const t = await getTranslations("thanks");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted">{t("genericBody")}</p>
    </main>
  );
}
