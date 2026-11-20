import "server-only";
import nodemailer from "nodemailer";
import { headers } from "next/headers";

/**
 * Envío por SMTP, para no atarse a un proveedor: en local lo recoge Mailpit y en producción
 * sirve cualquier servicio con SMTP (Resend: smtps://resend:API_KEY@smtp.resend.com:465).
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.error("mail: falta SMTP_URL, no se envía");
    return false;
  }
  try {
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Ekklesias <no-reply@ekklesias.local>",
      ...opts,
    });
    return true;
  } catch (error) {
    console.error("mail:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function getSiteUrl(): Promise<string> {
  const fixed = process.env.SITE_URL;
  if (fixed) return fixed.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
