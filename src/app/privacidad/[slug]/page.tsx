import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LegalStub } from "@/components/legal-stub";
import { getTenantBySlug } from "@/lib/tenants";

export default async function PrivacyPolicy({
  params,
}: PageProps<"/privacidad/[slug]">) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const t = await getTranslations("legal");
  return <LegalStub tenant={tenant} title={t("privacyTitle")} />;
}
