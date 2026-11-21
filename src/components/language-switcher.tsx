"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { CheckIcon, ChevronDownIcon, GlobeIcon } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        disabled={pending}
        className="group flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-cyan/60 hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)] aria-expanded:border-cyan disabled:opacity-60"
      >
        <GlobeIcon
          className={`size-4 text-cyan transition-transform duration-500 group-hover:rotate-[24deg] ${pending ? "animate-spin" : ""}`}
        />
        <span lang={current}>{localeNames[current as keyof typeof localeNames]}</span>
        <ChevronDownIcon className="size-3.5 text-muted transition-transform group-aria-expanded:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-44">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onClick={() => startTransition(() => setLocale(code))}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="flex items-center gap-2">
              <span className="w-6 text-xs font-semibold uppercase text-muted">
                {code}
              </span>
              {localeNames[code]}
            </span>
            {code === current ? <CheckIcon className="size-4 text-cyan" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
