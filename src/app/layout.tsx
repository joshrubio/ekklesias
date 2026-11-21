import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale, defaultLocale, dirFor } from "@/i18n/config";
import { fontClassNames } from "@/lib/fonts";
import { LanguageSwitcher } from "@/components/language-switcher";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : defaultLocale;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${fontClassNames} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <header className="flex items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              Ekklesias
            </Link>
            <LanguageSwitcher />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
