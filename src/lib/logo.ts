export const MAX_LOGO_BYTES = 512 * 1024;
export const LOGO_BUCKET = "tenant-logos";

export type LogoType = { ext: "png" | "jpg" | "webp"; mime: string };

/** Se decide por los primeros bytes, no por el nombre ni por el tipo que declare el navegador. */
export function sniffLogo(bytes: Uint8Array): LogoType | null {
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((byte, i) => bytes[offset + i] === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", mime: "image/png" };
  }
  if (startsWith([0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function logoUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}
