"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { savePreferencesAction, type PreferencesState } from "@/lib/member-actions";
import type { FormConsent } from "@/lib/consents";

const initial: PreferencesState = {};

export function PreferencesForm({
  token,
  items,
  current,
}: {
  token: string;
  items: FormConsent[];
  current: Record<string, boolean>;
}) {
  const t = useTranslations("preferences");
  const [state, action, pending] = useActionState(
    savePreferencesAction.bind(null, token),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="shown" value={items.map((i) => i.purpose).join(",")} />
      {items.map((item) => (
        <label
          key={item.purpose}
          className="flex min-h-11 items-start gap-3 rounded-md border border-border bg-surface p-3"
        >
          <input
            type="checkbox"
            name={`consent_${item.purpose}`}
            defaultChecked={current[item.purpose] === true}
            className="mt-1 size-5 shrink-0 accent-brand"
          />
          <span className="text-sm leading-relaxed">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand">
              {t(`purposes.${item.purpose}`)}
            </span>
            {item.text}
          </span>
        </label>
      ))}
      {state.status === "saved" && (
        <p role="status" className="rounded-md bg-surface p-3 text-sm font-medium text-brand">
          {t("saved")}
        </p>
      )}
      {state.status === "limited" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t("rateLimit")}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t("error")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-5 py-4 text-lg font-medium text-white disabled:opacity-60"
      >
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
