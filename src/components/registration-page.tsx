import { tenantStyle } from "@/lib/theme";
import { getLocale, getTranslations } from "next-intl/server";
import { RegistrationForm } from "@/components/registration-form";
import { ChurchAvatar } from "@/components/church-avatar";
import { getConsentTexts, type Tenant } from "@/lib/tenants";
import type { RegistrationSource } from "@/lib/consents";
import { isLocale, defaultLocale } from "@/i18n/config";

type Props = {
  tenant: Tenant;
  source: RegistrationSource;
  inviter?: { code: string; firstName: string };
};

export async function RegistrationPage({ tenant, source, inviter }: Props) {
  const t = await getTranslations("register");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : defaultLocale;
  const consents = await getConsentTexts(tenant.id, locale);

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 pb-16 pt-4"
      style={tenantStyle(tenant)}
    >
      <header className="flex flex-col gap-3">
        <ChurchAvatar name={tenant.name} logoPath={tenant.logo_path} />
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title", { name: tenant.name })}
        </h1>
        {inviter?.firstName && (
          <p className="text-lg text-muted">
            {t("invitedBy", { inviter: inviter.firstName })}
          </p>
        )}
      </header>
      <RegistrationForm
        tenantSlug={tenant.slug}
        inviterCode={inviter?.code ?? null}
        source={source}
        privacyHref={`/privacidad/${tenant.slug}`}
        consents={consents}
      />
    </main>
  );
}
