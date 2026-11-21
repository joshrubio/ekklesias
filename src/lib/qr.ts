import "server-only";
import QRCode from "qrcode";

const options = {
  errorCorrectionLevel: "Q",
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
} as const;

export const qrSources = ["qr", "nfc"] as const;
export type QrSource = (typeof qrSources)[number];

export function parseQrSource(value: string | null): QrSource {
  return (qrSources as readonly string[]).includes(value ?? "") ? (value as QrSource) : "qr";
}

export function memberLink(site: string, inviteCode: string, source: QrSource) {
  return `${site}/m/${inviteCode}?s=${source}`;
}

export function churchLink(site: string, slug: string, source: QrSource) {
  return `${site}/r/${slug}?s=${source}`;
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...options, type: "svg" });
}

export function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...options, type: "png", width: 1024 });
}

export function qrDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function qrResponse(opts: {
  text: string;
  format: string | null;
  download: boolean;
  filename: string;
}): Promise<Response> {
  const png = opts.format === "png";
  const body = png ? new Uint8Array(await qrPng(opts.text)) : await qrSvg(opts.text);
  const headers: Record<string, string> = {
    "Content-Type": png ? "image/png" : "image/svg+xml; charset=utf-8",
    "Cache-Control": "private, no-store",
  };
  if (opts.download) {
    headers["Content-Disposition"] = `attachment; filename="${opts.filename}.${png ? "png" : "svg"}"`;
  }
  return new Response(body, { headers });
}
