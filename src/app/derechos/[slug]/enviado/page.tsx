import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantBySlug } from "@/lib/tenants";

export default async function RightsSent({
  params,
}: PageProps<"/derechos/[slug]/enviado">) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const t = await getTranslations("rights");
  const legal = await getTranslations("legal");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("sentTitle")}</h1>
      <p className="text-lg">{t("sentBody")}</p>
      <Link href={`/c/${tenant.slug}`} className="text-sm underline">
        {legal("back")}
      </Link>
    </main>
  );
}
