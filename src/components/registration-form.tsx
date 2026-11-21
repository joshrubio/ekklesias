"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  registerAction,
  type RegisterState,
} from "@/lib/registration-actions";
import {
  commsGroup,
  othersGroup,
  requiredGroup,
  type FormConsent,
  type FormPurpose,
  type RegistrationSource,
} from "@/lib/consents";

type Props = {
  tenantSlug: string;
  inviterCode: string | null;
  source: RegistrationSource;
  privacyHref: string;
  consents: FormConsent[];
};

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-3 text-base text-foreground focus:outline-2 focus:outline-brand";

function isUnder14(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(value + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 14);
  return birth > limit;
}

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  const t = useTranslations("register");
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
      {optional && (
        <span className="ms-2 font-normal text-muted">({t("optional")})</span>
      )}
    </label>
  );
}

function Hint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-muted">
      {children}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  ) : null;
}

function ConsentBox({
  item,
  checked,
  error,
}: {
  item: FormConsent;
  checked: boolean;
  error: string | null;
}) {
  const t = useTranslations("register");
  const name = `consent_${item.purpose}`;
  return (
    <div>
      <label className="flex min-h-11 items-start gap-3 rounded-md border border-border bg-surface p-3">
        <input
          type="checkbox"
          name={name}
          id={name}
          defaultChecked={checked}
          required={item.required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span className="text-sm leading-relaxed">
          {item.purpose === "membership" && (
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand">
              {t("permissions.specialCategory")}
            </span>
          )}
          {item.text}
        </span>
      </label>
      <FieldError id={name} message={error} />
    </div>
  );
}

export function RegistrationForm({
  tenantSlug,
  inviterCode,
  source,
  privacyHref,
  consents,
}: Props) {
  const t = useTranslations("register");
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    {},
  );
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  const [birth, setBirth] = useState(values.birthDate ?? "");
  const [how, setHow] = useState(values.how ?? "");
  const minor = isUnder14(birth);
  const today = new Date().toISOString().slice(0, 10);

  const errorText = (field: string) =>
    errors[field] ? t(`errors.${errors[field]}`) : null;

  const boxes = (group: FormPurpose[]) =>
    group
      .map((purpose) => consents.find((c) => c.purpose === purpose))
      .filter((c): c is FormConsent => Boolean(c))
      .map((item) => (
        <ConsentBox
          key={item.purpose}
          item={item}
          checked={values[`consent_${item.purpose}`] === "on"}
          error={errorText(`consent_${item.purpose}`)}
        />
      ));

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="inviterCode" value={inviterCode ?? ""} />
      <input type="hidden" name="source" value={source} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      <p className="text-sm text-muted">{t("requiredNote")}</p>

      {state.formError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {t(`errors.${state.formError}`)}
        </p>
      )}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-2 text-xl font-semibold">
          {t("sections.data")}
        </legend>

        <div>
          <Label htmlFor="firstName">{t("fields.firstName")}</Label>
          <input
            id="firstName"
            name="firstName"
            required
            autoComplete="given-name"
            defaultValue={values.firstName}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            className={inputClass}
          />
          <FieldError id="firstName" message={errorText("firstName")} />
        </div>

        <div>
          <Label htmlFor="lastName">{t("fields.lastName")}</Label>
          <input
            id="lastName"
            name="lastName"
            required
            autoComplete="family-name"
            defaultValue={values.lastName}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            className={inputClass}
          />
          <FieldError id="lastName" message={errorText("lastName")} />
        </div>

        <div>
          <Label htmlFor="email">{t("fields.email")}</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="email" message={errorText("email")} />
        </div>

        <div>
          <Label htmlFor="phone">{t("fields.phone")}</Label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            dir="ltr"
            defaultValue={values.phone}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={`phone-hint${errors.phone ? " phone-error" : ""}`}
            className={inputClass}
          />
          <Hint id="phone-hint">{t("fields.phoneHint")}</Hint>
          <FieldError id="phone" message={errorText("phone")} />
        </div>

        <div>
          <Label htmlFor="birthDate">{t("fields.birthDate")}</Label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            required
            max={today}
            min="1900-01-01"
            autoComplete="bday"
            dir="ltr"
            value={birth}
            onChange={(event) => setBirth(event.target.value)}
            aria-invalid={errors.birthDate ? true : undefined}
            aria-describedby={`birthDate-hint${errors.birthDate ? " birthDate-error" : ""}`}
            className={inputClass}
          />
          <Hint id="birthDate-hint">{t("fields.birthHint")}</Hint>
          <FieldError id="birthDate" message={errorText("birthDate")} />
        </div>

        <div>
          <Label htmlFor="address" optional>
            {t("fields.address")}
          </Label>
          <input
            id="address"
            name="address"
            autoComplete="street-address"
            defaultValue={values.address}
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor="baptized" optional>
            {t("fields.baptized")}
          </Label>
          <select
            id="baptized"
            name="baptized"
            defaultValue={values.baptized ?? ""}
            className={inputClass}
          >
            <option value="">{t("fields.baptizedUnknown")}</option>
            <option value="yes">{t("fields.yes")}</option>
            <option value="no">{t("fields.no")}</option>
          </select>
        </div>
      </fieldset>

      {!inviterCode && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xl font-semibold">
            {t("sections.how")}
          </legend>
          {(["discovered", "invited"] as const).map((option) => (
            <label
              key={option}
              className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface p-3"
            >
              <input
                type="radio"
                name="how"
                value={option}
                required
                checked={how === option}
                onChange={() => setHow(option)}
                className="size-5 accent-brand"
              />
              <span>
                {option === "discovered"
                  ? t("fields.howDiscovered")
                  : t("fields.howInvited")}
              </span>
            </label>
          ))}
          <FieldError id="how" message={errorText("how")} />
          {how === "invited" && (
            <div>
              <Label htmlFor="invitedByName" optional>
                {t("fields.invitedByName")}
              </Label>
              <input
                id="invitedByName"
                name="invitedByName"
                defaultValue={values.invitedByName}
                aria-describedby="invitedByName-hint"
                className={inputClass}
              />
              <Hint id="invitedByName-hint">{t("fields.invitedByHint")}</Hint>
            </div>
          )}
        </fieldset>
      )}

      {minor && (
        <fieldset className="flex flex-col gap-5 rounded-lg border border-brand p-4">
          <legend className="px-2 text-xl font-semibold">
            {t("sections.guardian")}
          </legend>
          <p className="text-sm">{t("guardian.notice")}</p>
          <div>
            <Label htmlFor="guardianName">{t("fields.guardianName")}</Label>
            <input
              id="guardianName"
              name="guardianName"
              required
              defaultValue={values.guardianName}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="guardianEmail">{t("fields.guardianEmail")}</Label>
            <input
              id="guardianEmail"
              name="guardianEmail"
              type="email"
              required
              dir="ltr"
              defaultValue={values.guardianEmail}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="guardianRelationship">
              {t("fields.guardianRelationship")}
            </Label>
            <input
              id="guardianRelationship"
              name="guardianRelationship"
              required
              defaultValue={values.guardianRelationship}
              className={inputClass}
            />
          </div>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="guardianConfirm"
              required
              defaultChecked={values.guardianConfirm === "on"}
              className="mt-1 size-5 shrink-0 accent-brand"
            />
            <span className="text-sm leading-relaxed">
              {t("guardian.confirm")}
            </span>
          </label>
          <FieldError id="guardian" message={errorText("guardian")} />
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xl font-semibold">
          {t("sections.permissions")}
        </legend>
        <p className="text-sm text-muted">{t("permissions.intro")}</p>

        <h3 className="mt-2 font-medium">{t("permissions.required")}</h3>
        {boxes(requiredGroup)}
        <a
          href={privacyHref}
          target="_blank"
          rel="noopener"
          className="text-sm underline"
        >
          {t("permissions.privacyLink")}
        </a>

        <h3 className="mt-4 font-medium">
          {t("permissions.comms")}{" "}
          <span className="font-normal text-muted">({t("optional")})</span>
        </h3>
        {boxes(commsGroup)}

        <h3 className="mt-4 font-medium">
          {t("permissions.others")}{" "}
          <span className="font-normal text-muted">({t("optional")})</span>
        </h3>
        {boxes(othersGroup)}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand glow-btn px-5 py-4 text-lg font-semibold text-brand-foreground disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
