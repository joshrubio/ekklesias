import { tenantStyle } from "@/lib/theme";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RightsForm } from "@/components/rights-form";
import { getTenantBySlug } from "@/lib/tenants";

export default async function DataRights({
  params,
}: PageProps<"/derechos/[slug]">) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const t = await getTranslations("rights");
  const legal = await getTranslations("legal");

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12"
      style={tenantStyle(tenant)}
    >
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted">
        {legal("draft")}
      </p>
      <p className="text-lg">{t("intro", { church: tenant.name })}</p>
      <RightsForm slug={tenant.slug} />
      <section>
        <h2 className="font-medium">{legal("controller")}</h2>
        <p className="text-muted">{tenant.name}</p>
        <p dir="ltr" className="text-muted">
          {legal("contact", { email: tenant.contact_email })}
        </p>
      </section>
      <Link href={`/c/${tenant.slug}`} className="text-sm underline">
        {legal("back")}
      </Link>
    </main>
  );
}
