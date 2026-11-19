"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames } from "@/i18n/config";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t("language")}
      value={current}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        startTransition(() => setLocale(next));
      }}
      className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
    >
      {locales.map((code) => (
        <option key={code} value={code} lang={code}>
          {localeNames[code]}
        </option>
      ))}
    </select>
  );
}
