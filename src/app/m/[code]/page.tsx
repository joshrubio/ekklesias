import { notFound } from "next/navigation";
import { RegistrationPage } from "@/components/registration-page";
import { parseSource } from "@/lib/consents";
import { getInviter } from "@/lib/tenants";

export default async function PersonalInvite({
  params,
  searchParams,
}: PageProps<"/m/[code]">) {
  const { code } = await params;
  const { s } = await searchParams;

  if (!/^[0-9a-f]{12}$/.test(code)) notFound();
  const inviter = await getInviter(code);
  if (!inviter) notFound();

  return (
    <RegistrationPage
      tenant={inviter.tenant}
      source={parseSource(s)}
      inviter={{ code, firstName: inviter.firstName }}
    />
  );
}
