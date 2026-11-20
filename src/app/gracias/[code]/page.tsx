import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/copy-button";
import { getInviter, safeBrand } from "@/lib/tenants";

export default async function Thanks({
  params,
  searchParams,
}: PageProps<"/gracias/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const tutor = Array.isArray(sp.tutor) ? sp.tutor[0] : sp.tutor;
  if (!/^[0-9a-f]{12}$/.test(code)) notFound();
  const member = await getInviter(code);
  if (!member) notFound();

  const t = await getTranslations("thanks");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = `${proto}://${host}/m/${code}`;

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12"
      style={{ "--brand": safeBrand(member.tenant.brand_color) } as React.CSSProperties}
    >
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted">{t("body")}</p>
      {tutor === "sent" || tutor === "failed" ? (
        <p role="status" className="rounded-md border border-border bg-surface p-4 text-base">
          {tutor === "sent" ? t("guardianSent") : t("guardianFailed")}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">{t("inviteTitle")}</h2>
        <p className="text-sm text-muted">{t("inviteBody")}</p>
        <p dir="ltr" className="break-all rounded-md bg-background p-3 text-sm">
          {link}
        </p>
        <div>
          <CopyButton text={link} label={t("copy")} doneLabel={t("copied")} />
        </div>
      </section>
    </main>
  );
}
