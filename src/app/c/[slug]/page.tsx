import { tenantStyle } from "@/lib/theme";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantBySlug } from "@/lib/tenants";
import { ChurchAvatar } from "@/components/church-avatar";

export default async function ChurchHome({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const t = await getTranslations("church");

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12 sm:py-20"
      style={tenantStyle(tenant)}
    >
      <ChurchAvatar name={tenant.name} logoPath={tenant.logo_path} className="size-20" />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("welcome", { name: tenant.name })}
      </h1>
      <p className="text-lg text-muted">{t("intro")}</p>
      <div>
        <Link
          href={`/r/${tenant.slug}`}
          className="inline-flex w-full items-center justify-center rounded-full bg-brand glow-btn px-5 py-4 text-lg font-semibold text-brand-foreground sm:w-auto"
        >
          {t("register")}
        </Link>
      </div>
      <nav className="mt-auto flex flex-col gap-2 text-sm text-muted">
        <Link href={`/privacidad/${tenant.slug}`} className="underline">
          {t("privacy")}
        </Link>
        <Link href={`/derechos/${tenant.slug}`} className="underline">
          {t("rights")}
        </Link>
      </nav>
    </main>
  );
}
