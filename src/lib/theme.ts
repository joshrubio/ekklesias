import type { CSSProperties } from "react";

export const fontKeys = [
  "fraunces",
  "playfair",
  "lora",
  "merriweather",
  "dm-serif",
  "montserrat",
  "poppins",
  "space-grotesk",
  "geist",
] as const;
export type FontKey = (typeof fontKeys)[number];

export const fontLabels: Record<FontKey, string> = {
  fraunces: "Fraunces",
  playfair: "Playfair Display",
  lora: "Lora",
  merriweather: "Merriweather",
  "dm-serif": "DM Serif Display",
  montserrat: "Montserrat",
  poppins: "Poppins",
  "space-grotesk": "Space Grotesk",
  geist: "Geist",
};

export const defaultBrand = "#22d3ee";
export const defaultFont: FontKey = "fraunces";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: string | null | undefined): value is string {
  return !!value && HEX.test(value);
}

export function isFontKey(value: string | null | undefined): value is FontKey {
  return !!value && (fontKeys as readonly string[]).includes(value);
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legible sobre un color de fondo: oscuro sobre claros, blanco sobre oscuros. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#03141a" : "#ffffff";
}

/** El tema es oscuro: un color demasiado oscuro se aclara para que no desaparezca. */
export function visible(hex: string): string {
  if (luminance(hex) >= 0.06) return hex;
  const [r, g, b] = channels(hex).map((v) => Math.round(v + (255 - v) * 0.45));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export type ThemeInput = {
  brand_color: string;
  accent_color?: string | null;
  font?: string | null;
};

/** Variables CSS que reescriben la paleta y la tipografía de titulares para una iglesia. */
export function tenantStyle(theme: ThemeInput | null | undefined): CSSProperties {
  const brand = visible(isHex(theme?.brand_color) ? theme.brand_color : defaultBrand);
  const accent = isHex(theme?.accent_color) ? visible(theme.accent_color) : brand;
  const font = isFontKey(theme?.font) ? theme.font : defaultFont;

  return {
    "--brand": brand,
    "--brand-foreground": readableOn(brand),
    "--cyan": accent,
    "--cyan-soft": `color-mix(in srgb, ${accent} 60%, white)`,
    "--primary": accent,
    "--primary-foreground": readableOn(accent),
    "--ring": accent,
    "--font-heading": `var(--font-${font === "geist" ? "geist-sans" : font})`,
  } as CSSProperties;
}
