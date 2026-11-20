import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestMeta, hashIp } from "@/lib/request-meta";

export const limits = {
  register: { limit: 40, windowSeconds: 3600 },
  rights: { limit: 5, windowSeconds: 3600 },
  preferences: { limit: 20, windowSeconds: 3600 },
  unsubscribe: { limit: 20, windowSeconds: 3600 },
  loginIp: { limit: 10, windowSeconds: 900 },
  loginEmail: { limit: 5, windowSeconds: 900 },
} as const;

type Rule = keyof typeof limits;

async function allowed(key: string, rule: Rule): Promise<boolean> {
  const { limit, windowSeconds } = limits[rule];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Si el contador falla, no se bloquea a nadie: mejor disponible que cerrado por un fallo ajeno.
    console.error("rate limit:", error.message);
    return true;
  }
  return data === true;
}

export async function allowByIp(rule: Rule): Promise<boolean> {
  const { ipHash } = await getRequestMeta();
  return allowed(`${rule}:${ipHash}`, rule);
}

export async function allowBySubject(rule: Rule, subject: string): Promise<boolean> {
  return allowed(`${rule}:${hashIp(subject.toLowerCase())}`, rule);
}
