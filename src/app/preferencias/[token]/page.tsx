import { tenantStyle } from "@/lib/theme";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PreferencesForm } from "@/components/preferences-form";
import { getPreferences } from "@/lib/preferences";
import { getConsentTexts, getTenantBySlug } from "@/lib/tenants";
import { optionalPurposes } from "@/lib/consents";
import { defaultLocale, isLocale } from "@/i18n/config";

export const metadata = { robots: { index: false, follow: false } };

export default async function PreferencesPage({
  params,
}: PageProps<"/preferencias/[token]">) {
  const { token } = await params;
  const t = await getTranslations("preferences");
  const prefs = await getPreferences(token);

  if (!prefs) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("invalidTitle")}</h1>
        <p className="text-muted">{t("invalidBody")}</p>
      </main>
    );
  }

  const tenant = await getTenantBySlug(prefs.tenant_slug);
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : defaultLocale;
  const texts = tenant ? await getConsentTexts(tenant.id, locale) : [];
  const items = texts.filter((c) =>
    (optionalPurposes as readonly string[]).includes(c.purpose),
  );

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12"
      style={tenantStyle(tenant)}
    >
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("title", { name: prefs.first_name })}
      </h1>
      <p className="text-muted">{t("intro", { church: prefs.tenant_name })}</p>
      <PreferencesForm token={token} items={items} current={prefs.consents} />
      <p className="text-sm text-muted">
        {t("withdrawNote")}{" "}
        <Link href={`/derechos/${prefs.tenant_slug}`} className="underline">
          {t("rightsLink")}
        </Link>
      </p>
    </main>
  );
}
