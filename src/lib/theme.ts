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

export const themeModes = ["light", "dark"] as const;
export type ThemeMode = (typeof themeModes)[number];

export const defaultBrand = "#22d3ee";
export const defaultFont: FontKey = "fraunces";
export const defaultMode: ThemeMode = "light";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: string | null | undefined): value is string {
  return !!value && HEX.test(value);
}

export function isFontKey(value: string | null | undefined): value is FontKey {
  return !!value && (fontKeys as readonly string[]).includes(value);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return !!value && (themeModes as readonly string[]).includes(value);
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
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

/**
 * Ajusta un color para que se vea sobre el fondo del modo elegido: en oscuro aclara los
 * colores muy oscuros; en claro oscurece los muy claros (sobre blanco, un amarillo pálido
 * desaparecería).
 */
export function visible(hex: string, mode: ThemeMode = "dark"): string {
  if (mode === "dark") {
    if (luminance(hex) >= 0.06) return hex;
    const [r, g, b] = channels(hex).map((v) => v + (255 - v) * 0.45) as [number, number, number];
    return toHex([r, g, b]);
  }

  let current = hex;
  for (let i = 0; i < 10 && luminance(current) > 0.2; i++) {
    const [r, g, b] = channels(current).map((v) => v * 0.88) as [number, number, number];
    current = toHex([r, g, b]);
  }
  return current;
}

export type ThemeInput = {
  brand_color: string;
  accent_color?: string | null;
  font?: string | null;
  theme_mode?: string | null;
};

export function modeOf(theme: ThemeInput | null | undefined): ThemeMode {
  return isThemeMode(theme?.theme_mode) ? theme.theme_mode : defaultMode;
}

/** Variables CSS que reescriben la paleta y la tipografía de titulares para una iglesia. */
export function tenantStyle(theme: ThemeInput | null | undefined): CSSProperties {
  const mode = modeOf(theme);
  const brand = visible(isHex(theme?.brand_color) ? theme.brand_color : defaultBrand, mode);
  const accent = isHex(theme?.accent_color) ? visible(theme.accent_color, mode) : brand;
  const font = isFontKey(theme?.font) ? theme.font : defaultFont;

  const soft =
    mode === "light"
      ? `color-mix(in srgb, ${accent} 75%, black)`
      : `color-mix(in srgb, ${accent} 60%, white)`;

  return {
    "--brand": brand,
    "--brand-foreground": readableOn(brand),
    "--cyan": accent,
    "--cyan-soft": soft,
    "--primary": accent,
    "--primary-foreground": readableOn(accent),
    "--ring": accent,
    "--font-heading": `var(--font-${font === "geist" ? "geist-sans" : font})`,
  } as CSSProperties;
}

/** Atributos para el elemento raíz de una página de iglesia: variables y modo. */
export function tenantProps(theme: ThemeInput | null | undefined) {
  return { style: tenantStyle(theme), "data-theme": modeOf(theme) } as const;
}
