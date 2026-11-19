import type { Metadata } from "next";
import { Geist, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale, defaultLocale, dirFor } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

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
      className={`${geistSans.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <header className="flex items-center justify-end px-4 py-3 sm:px-6">
            <LanguageSwitcher />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
