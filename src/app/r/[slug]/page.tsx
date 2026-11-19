import { notFound } from "next/navigation";
import { RegistrationPage } from "@/components/registration-page";
import { parseSource } from "@/lib/consents";
import { getTenantBySlug } from "@/lib/tenants";

export default async function GeneralRegistration({
  params,
  searchParams,
}: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const { s } = await searchParams;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return <RegistrationPage tenant={tenant} source={parseSource(s)} />;
}
