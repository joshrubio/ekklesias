import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestMeta, hashIp } from "@/lib/request-meta";

type Rule = { limit: number; windowSeconds: number };

export const limits = {
  register: { limit: 40, windowSeconds: 3600 },
  registerGlobal: { limit: 400, windowSeconds: 3600 },
  rights: { limit: 5, windowSeconds: 3600 },
  rightsGlobal: { limit: 60, windowSeconds: 3600 },
  preferences: { limit: 20, windowSeconds: 3600 },
  unsubscribe: { limit: 20, windowSeconds: 3600 },
  guardian: { limit: 20, windowSeconds: 3600 },
  loginIp: { limit: 20, windowSeconds: 900 },
  loginPair: { limit: 5, windowSeconds: 900 },
  loginEmail: { limit: 50, windowSeconds: 3600 },
} as const satisfies Record<string, Rule>;

type RuleName = keyof typeof limits;

/**
 * Si el contador falla: en las acciones públicas se deja pasar (disponible antes que cerrado
 * por un fallo ajeno); en el login se bloquea, porque sin contador no hay freno a la fuerza bruta.
 */
async function allowed(key: string, rule: RuleName, failClosed: boolean): Promise<boolean> {
  const { limit, windowSeconds } = limits[rule];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit:", error.message);
    return !failClosed;
  }
  return data === true;
}

const globalRule: Partial<Record<string, RuleName>> = {
  register: "registerGlobal",
  rights: "rightsGlobal",
};

/** Límite por conexión y, si la acción lo tiene, tope global contra inundaciones distribuidas. */
export async function allowByIp(rule: "register" | "rights" | "preferences" | "unsubscribe" | "guardian") {
  const { ipHash } = await getRequestMeta();
  if (!(await allowed(`${rule}:${ipHash}`, rule, false))) return false;
  const global = globalRule[rule];
  return global ? allowed(`global:${rule}`, global, false) : true;
}

/**
 * Login. Tres frenos: por conexión, por pareja conexión+email (frena adivinar una cuenta sin
 * dejar que otra conexión la bloquee) y un tope por email generoso contra ataques repartidos.
 */
export async function allowLogin(email: string): Promise<boolean> {
  const { ipHash } = await getRequestMeta();
  const mail = hashIp(email.trim().toLowerCase());
  return (
    (await allowed(`loginIp:${ipHash}`, "loginIp", true)) &&
    (await allowed(`loginPair:${ipHash}:${mail}`, "loginPair", true)) &&
    (await allowed(`loginEmail:${mail}`, "loginEmail", true))
  );
}
