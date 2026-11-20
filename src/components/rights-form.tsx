"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { rightsRequestAction, type RightsState } from "@/lib/member-actions";

const types = ["access", "rectification", "erasure", "portability", "objection"] as const;
const initial: RightsState = {};
const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-3 text-base text-foreground focus:outline-2 focus:outline-brand";

export function RightsForm({ slug }: { slug: string }) {
  const t = useTranslations("rights");
  const [state, action, pending] = useActionState(
    rightsRequestAction.bind(null, slug),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -start-[9999px] h-0 w-0 opacity-0"
      />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className={inputClass} />
        <p className="mt-1 text-sm text-muted">{t("emailHint")}</p>
        {state.error === "email" && (
          <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">{t("errors.email")}</p>
        )}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("type")}</legend>
        {types.map((type) => (
          <label key={type} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface p-3">
            <input type="radio" name="type" value={type} required className="size-5 accent-brand" />
            <span className="text-sm">{t(`types.${type}`)}</span>
          </label>
        ))}
        {state.error === "type" && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">{t("errors.type")}</p>
        )}
      </fieldset>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          {t("notes")} <span className="font-normal text-muted">({t("optional")})</span>
        </label>
        <textarea id="notes" name="notes" rows={3} maxLength={2000} className={inputClass} />
      </div>
      {state.error === "rate" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">{t("errors.rate")}</p>
      )}
      {state.error === "server" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">{t("errors.server")}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-5 py-4 text-lg font-medium text-white disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
