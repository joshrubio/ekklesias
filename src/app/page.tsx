import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  QrCodeIcon,
  HeartHandshakeIcon,
  NfcIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WaveBackground } from "@/components/wave-background";
import { Reveal } from "@/components/reveal";
import { Backdrop } from "@/components/illustrations";
import { BrowserFrame, PhoneFrame } from "@/components/frames";
import { QrCard } from "@/components/qr-card";
import { cn } from "@/lib/utils";

type Item = { title: string; body: string; soon?: boolean };
type Fact = { value: string; label: string };
type Faq = { q: string; a: string };

const stepIcons = [NfcIcon, SparklesIcon, HeartHandshakeIcon];
const featureIcons = [QrCodeIcon, MessageSquareIcon, LayoutDashboardIcon, ClipboardCheckIcon];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="h-auto border-cyan/40 bg-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-soft"
    >
      {children}
    </Badge>
  );
}

function Ripples({ alt }: { alt: string }) {
  return (
    <div className="relative flex aspect-square w-full max-w-sm items-center justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute inset-6 rounded-full border border-cyan/50"
          style={{ animation: `ripple 4.5s ${i * 1.5}s cubic-bezier(0.22, 1, 0.36, 1) infinite` }}
        />
      ))}
      <PhoneFrame
        src="/screens/church-lifepoint.webp"
        alt={alt}
        priority
        className="relative w-[48%] drop-shadow-[0_0_60px_rgba(34,211,238,0.25)]"
      />
    </div>
  );
}

function CtaLink({ href, children, ghost = false }: { href: string; children: React.ReactNode; ghost?: boolean }) {
  const Arrow = ArrowRightIcon;
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: ghost ? "outline" : "default", size: "lg" }),
        "group h-auto rounded-full px-7 py-4 text-base",
        ghost ? "border-border bg-transparent" : "glow-btn font-semibold",
      )}
    >
      {children}
      {ghost ? null : (
        <Arrow className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      )}
    </Link>
  );
}

export default async function Home() {
  const t = await getTranslations("landing");
  const steps = t.raw("steps.items") as Item[];
  const community = t.raw("community.items") as Item[];
  const features = t.raw("features.items") as Item[];
  const customize = t.raw("customize.items") as Item[];
  const members = t.raw("members.items") as Item[];
  const facts = t.raw("trust.facts") as Fact[];
  const faq = t.raw("faq.items") as Faq[];

  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <section className="relative isolate">
        <WaveBackground className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[75%] w-full [mask-image:linear-gradient(to_bottom,transparent,black_35%)]" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-24 pt-10 sm:pb-36 sm:pt-16 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-6">
            <Reveal>
              <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
                {t("hero.title")}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
                {t("hero.body")}
              </p>
            </Reveal>
            <Reveal delay={0.24} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CtaLink href="/c/lifepoint">{t("hero.cta")}</CtaLink>
              <CtaLink href="#como" ghost>
                {t("hero.secondary")}
              </CtaLink>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="text-sm text-muted">{t("hero.note")}</p>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="flex justify-center lg:justify-end">
            <Ripples alt={t("visuals.heroAlt")} />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-16 sm:py-28">
        <Reveal className="flex max-w-3xl flex-col items-start gap-4">
          <Eyebrow>{t("features.eyebrow")}</Eyebrow>
          <h2 className="text-4xl sm:text-6xl">{t("features.title")}</h2>
        </Reveal>

        {[0, 2, 3].map((index, row) => {
          const item = features[index];
          const Icon = featureIcons[index];
          const flip = row % 2 === 1;
          return (
            <Reveal
              key={item.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              <div className={cn("flex flex-col gap-4", flip && "lg:order-2")}>
                <span className="flex size-12 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                  <Icon className="size-6" />
                </span>
                <h3 className="font-display text-3xl font-semibold sm:text-4xl">{item.title}</h3>
                <p className="text-lg leading-relaxed text-muted">{item.body}</p>
              </div>
              <div className={cn("flex justify-center", flip && "lg:order-1")}>
                {index === 0 ? (
                  <QrCard label={t("visuals.qrLabel")} hint={t("visuals.qrHint")} />
                ) : index === 2 ? (
                  <BrowserFrame
                    src="/screens/admin-miembros.webp"
                    alt={t("visuals.adminAlt")}
                    url="Ekklesias · Miembros"
                    width={1800}
                    height={1055}
                  />
                ) : (
                  <PhoneFrame
                    src="/screens/permisos-betel.webp"
                    alt={t("visuals.permisosAlt")}
                    className="max-w-[19rem]"
                  />
                )}
              </div>
            </Reveal>
          );
        })}

        <Reveal>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-8 py-8 sm:flex-row sm:items-center sm:gap-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
              <MessageSquareIcon className="size-6" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="font-display text-2xl font-semibold">{features[1].title}</h3>
              <p className="leading-relaxed text-muted">{features[1].body}</p>
            </div>
            <Badge variant="outline" className="w-fit border-cyan/40 text-cyan-soft">
              {t("features.soon")}
            </Badge>
          </div>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden border-y border-border bg-sand py-16 sm:py-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6">
          <Reveal className="flex max-w-3xl flex-col items-start gap-4">
            <Eyebrow>{t("customize.eyebrow")}</Eyebrow>
            <h2 className="text-4xl sm:text-6xl">{t("customize.title")}</h2>
            <p className="text-lg leading-relaxed text-muted sm:text-xl">{t("customize.body")}</p>
          </Reveal>

          <div className="grid items-end gap-10 sm:grid-cols-3">
            {(["lifepoint", "betel", "montesion"] as const).map((slug, i) => (
              <Reveal
                key={slug}
                delay={i * 0.12}
                className={cn("flex flex-col items-center gap-4", i === 1 && "sm:-translate-y-10")}
              >
                <PhoneFrame
                  src={`/screens/church-${slug}.webp`}
                  alt={t(`customize.examples.${slug}`)}
                  className="max-w-[17rem]"
                />
                <p className="text-sm font-medium text-muted">{t(`customize.examples.${slug}`)}</p>
              </Reveal>
            ))}
          </div>

          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {customize.map((item, i) => (
              <Reveal as="li" key={item.title} delay={i * 0.08} className="group flex list-none gap-4">
                <span
                  aria-hidden="true"
                  className="mt-2 size-3 shrink-0 rounded-full bg-cyan shadow-[0_0_14px_color-mix(in_srgb,var(--cyan)_70%,transparent)] transition-transform duration-300 group-hover:scale-150"
                />
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="leading-relaxed text-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal className="grid items-center gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-3xl font-semibold">{t("customize.editorTitle")}</h3>
              <p className="text-lg leading-relaxed text-muted">{t("customize.editorBody")}</p>
            </div>
            <BrowserFrame
              src="/screens/admin-editor.webp"
              alt={t("visuals.editorAlt")}
              url="Ekklesias · Ajustes"
              width={1800}
              height={1195}
            />
          </Reveal>
        </div>
      </section>

      <section id="como" className="relative isolate overflow-hidden border-y border-border bg-sand py-16 sm:py-24">
        <Backdrop name="waves" className="inset-x-0 bottom-0 h-40" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
          <Reveal className="flex max-w-2xl flex-col items-start gap-4">
            <Eyebrow>{t("steps.eyebrow")}</Eyebrow>
            <h2 className="text-3xl sm:text-5xl">{t("steps.title")}</h2>
          </Reveal>
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <Reveal as="li" key={step.title} delay={i * 0.1} className="list-none">
                  <Card className="lift h-full border border-border bg-card [--card-spacing:--spacing(8)]">
                    <CardHeader>
                      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                        <Icon className="size-6" />
                      </span>
                      <CardTitle className="font-display text-xl font-semibold">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {step.body}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 sm:py-28">
        <Reveal className="flex max-w-3xl flex-col items-start gap-5">
          <Eyebrow>{t("community.eyebrow")}</Eyebrow>
          <h2 className="text-4xl sm:text-6xl">{t("community.title")}</h2>
          <p className="text-lg leading-relaxed text-muted sm:text-xl">
            {t("community.body")}
          </p>
        </Reveal>
        <ul className="grid gap-5 md:grid-cols-3">
          {community.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 0.1} className="list-none">
              <div className="lift flex h-full flex-col gap-2 rounded-xl border border-border bg-surface px-7 pb-8 pt-9">
                <UsersIcon className="mb-2 size-6 text-cyan" aria-hidden="true" />
                <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                <p className="leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="relative isolate overflow-hidden border-y border-border bg-sand py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
          <Reveal className="flex max-w-2xl flex-col items-start gap-4">
            <Eyebrow>{t("members.eyebrow")}</Eyebrow>
            <h2 className="text-3xl sm:text-4xl">{t("members.title")}</h2>
          </Reveal>
          <ul className="grid gap-8 md:grid-cols-3">
            {members.map((item, i) => (
              <Reveal as="li" key={item.title} delay={i * 0.1} className="group flex list-none gap-4">
                <span
                  aria-hidden="true"
                  className="mt-2 size-3 shrink-0 rounded-full bg-cyan shadow-[0_0_14px_rgba(34,211,238,0.7)] transition-transform duration-300 group-hover:scale-150"
                />
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="leading-relaxed text-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative isolate overflow-hidden py-16 sm:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_24rem_at_50%_0%,rgba(34,211,238,0.18),transparent_70%)]"
        />
        <Backdrop name="swell" className="inset-x-0 bottom-0 h-48" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
          <Reveal className="flex max-w-3xl flex-col items-start gap-5">
            <ShieldCheckIcon className="size-9 text-cyan" aria-hidden="true" />
            <h2 className="text-4xl sm:text-6xl">{t("trust.title")}</h2>
            <p className="text-lg leading-relaxed text-muted">{t("trust.body")}</p>
          </Reveal>
          <dl className="grid gap-5 sm:grid-cols-3">
            {facts.map((fact, i) => (
              <Reveal key={fact.label} delay={i * 0.1}>
                <div className="lift flex h-full flex-col gap-2 rounded-xl border border-border bg-surface px-6 pb-7 pt-8">
                  <dt className="font-display text-6xl font-semibold text-cyan-soft">
                    {fact.value}
                  </dt>
                  <dd className="text-muted">{fact.label}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pb-16 sm:pb-24">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl">{t("faq.title")}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Accordion className="gap-3">
            {faq.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="rounded-lg border border-border bg-surface px-5 transition-colors hover:border-cyan/50 data-open:border-cyan/60"
              >
                <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-xl border border-cyan/30 bg-surface px-6 py-16 text-center">
            <WaveBackground className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60" />
            <h2 className="text-4xl sm:text-6xl">{t("cta.title")}</h2>
            <p className="max-w-xl text-lg text-muted">{t("cta.body")}</p>
            <CtaLink href="/c/lifepoint">{t("cta.button")}</CtaLink>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-sm text-muted">
        {t("footer")}
      </footer>
    </main>
  );
}
