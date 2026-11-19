import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { safeBrand, type Tenant } from "@/lib/tenants";

export async function LegalStub({
  tenant,
  title,
  body,
}: {
  tenant: Tenant;
  title: string;
  body?: string;
}) {
  const t = await getTranslations("legal");

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12"
      style={{ "--brand": safeBrand(tenant.brand_color) } as React.CSSProperties}
    >
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted">
        {t("draft")}
      </p>
      {body && <p className="text-lg">{body}</p>}
      <section>
        <h2 className="font-medium">{t("controller")}</h2>
        <p className="text-muted">{tenant.name}</p>
        <p dir="ltr" className="text-muted">
          {t("contact", { email: tenant.contact_email })}
        </p>
      </section>
      <Link href={`/c/${tenant.slug}`} className="text-sm underline">
        {t("back")}
      </Link>
    </main>
  );
}
