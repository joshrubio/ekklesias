export const formPurposes = [
  "membership",
  "privacy_policy",
  "comms_email",
  "comms_whatsapp",
  "comms_sms",
  "visibility",
  "images",
] as const;

export type FormPurpose = (typeof formPurposes)[number];

export const requiredGroup: FormPurpose[] = ["membership", "privacy_policy"];
export const commsGroup: FormPurpose[] = [
  "comms_email",
  "comms_whatsapp",
  "comms_sms",
];
export const othersGroup: FormPurpose[] = ["visibility", "images"];

export type FormConsent = {
  purpose: FormPurpose;
  text: string;
  required: boolean;
};

export const registrationSources = ["nfc", "qr", "link"] as const;
export type RegistrationSource = (typeof registrationSources)[number];

export function parseSource(value: string | string[] | undefined): RegistrationSource {
  const first = Array.isArray(value) ? value[0] : value;
  return (registrationSources as readonly string[]).includes(first ?? "")
    ? (first as RegistrationSource)
    : "link";
}

export const TOKEN_RE = /^[0-9a-f]{64}$/;

export const optionalPurposes = [
  "comms_email",
  "comms_whatsapp",
  "comms_sms",
  "visibility",
  "images",
] as const;
