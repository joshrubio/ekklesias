import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("home");
  const features = ["tap", "consent", "tenants"] as const;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 sm:py-20">
      <section className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ekklesias
        </h1>
        <p className="max-w-xl text-lg text-muted">{t("tagline")}</p>
        <div>
          <Link
            href="/c/lifepoint"
            className="inline-flex items-center rounded-md bg-brand px-5 py-3 font-medium text-white"
          >
            {t("demo")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((key) => (
          <article
            key={key}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="font-medium">{t(`features.${key}.title`)}</h2>
            <p className="mt-2 text-sm text-muted">
              {t(`features.${key}.body`)}
            </p>
          </article>
        ))}
      </section>

      <footer className="mt-auto text-sm text-muted">{t("footer")}</footer>
    </main>
  );
}
