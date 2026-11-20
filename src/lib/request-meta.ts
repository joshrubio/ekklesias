import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

export function hashIp(ip: string): string {
  const salt =
    process.env.IP_HASH_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "";
  return createHash("sha256").update(salt + ip).digest("hex");
}

export async function getRequestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return { userAgent: h.get("user-agent") ?? "", ipHash: hashIp(ip) };
}
