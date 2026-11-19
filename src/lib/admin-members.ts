import "server-only";
import { createUserClient } from "@/lib/supabase/server";
import { formPurposes, type FormPurpose } from "@/lib/consents";

export const purposeLabels: Record<FormPurpose, string> = {
  membership: "Datos como miembro",
  privacy_policy: "Política de privacidad",
  comms_email: "Email",
  comms_whatsapp: "WhatsApp",
  comms_sms: "SMS",
  visibility: "Visibilidad",
  images: "Fotos",
};

export type MemberRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  baptized: boolean | null;
  locale: string;
  invite_code: string;
  invited_by: string | null;
  invited_by_text: string | null;
  discovered_alone: boolean;
  registered_via: string;
  status: "active" | "erased";
  registered_at: string;
};

export const memberColumns =
  "id, first_name, last_name, email, phone, birth_date, address, baptized, locale, invite_code, invited_by, invited_by_text, discovered_alone, registered_via, status, registered_at";

export function parsePurpose(value: string | string[] | undefined): FormPurpose | null {
  const first = Array.isArray(value) ? value[0] : value;
  return (formPurposes as readonly string[]).includes(first ?? "")
    ? (first as FormPurpose)
    : null;
}

export function cleanSearch(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").replace(/[^\p{L}\p{N}@.+\s-]/gu, "").trim().slice(0, 60);
}

export async function listMembers(opts: {
  tenantId: string;
  q: string;
  purpose: FormPurpose | null;
}): Promise<{ members: MemberRow[]; granted: Map<string, Set<string>> }> {
  const supabase = await createUserClient();

  let query = supabase
    .from("members")
    .select(memberColumns)
    .eq("tenant_id", opts.tenantId)
    .order("registered_at", { ascending: false })
    .limit(500);

  if (opts.q) {
    const term = `%${opts.q}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
    );
  }

  const { data: consents } = await supabase
    .from("member_consents_current")
    .select("member_id, purpose, granted")
    .eq("tenant_id", opts.tenantId)
    .eq("granted", true);

  const granted = new Map<string, Set<string>>();
  for (const c of consents ?? []) {
    const set = granted.get(c.member_id) ?? new Set<string>();
    set.add(c.purpose);
    granted.set(c.member_id, set);
  }

  if (opts.purpose) {
    const ids = [...granted.entries()]
      .filter(([, set]) => set.has(opts.purpose!))
      .map(([id]) => id);
    if (ids.length === 0) return { members: [], granted };
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw new Error(`No se pudo leer la lista de miembros: ${error.message}`);
  return { members: (data ?? []) as MemberRow[], granted };
}

export function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
