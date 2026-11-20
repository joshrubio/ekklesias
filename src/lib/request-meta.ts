import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { clientIpFromHeader } from "@/lib/client-ip";

export function hashIp(ip: string): string {
  const salt =
    process.env.IP_HASH_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "";
  return createHash("sha256").update(salt + ip).digest("hex");
}

export async function getClientIp(): Promise<string> {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  const h = await headers();
  return clientIpFromHeader(h.get("x-forwarded-for"), Number.isFinite(hops) ? hops : 1);
}

export async function getRequestMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? "",
    ipHash: hashIp(await getClientIp()),
  };
}
