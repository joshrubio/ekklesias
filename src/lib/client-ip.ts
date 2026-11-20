/**
 * x-forwarded-for lleva "cliente, proxy1, proxy2…" y cada proxy añade su entrada por la
 * derecha. Las entradas de la izquierda las puede escribir cualquiera, así que solo se
 * confía en la que añade nuestro propio proxy: la que queda a `hops` posiciones del final.
 * Con 0 se ignora la cabecera (la app recibe las peticiones directamente).
 */
export function clientIpFromHeader(xff: string | null, hops: number): string {
  if (hops <= 0) return "direct";
  const list = (xff ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return "unknown";
  return list[Math.max(0, list.length - hops)];
}
