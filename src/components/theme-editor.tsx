"use client";

import { useState } from "react";
import { fontKeys, fontLabels, tenantStyle, type FontKey } from "@/lib/theme";

type Props = {
  churchName: string;
  brandColor: string;
  accentColor: string | null;
  font: FontKey;
};

const family = (key: FontKey) =>
  `var(--font-${key === "geist" ? "geist-sans" : key}), system-ui, sans-serif`;

export function ThemeEditor(props: Props) {
  const [brand, setBrand] = useState(props.brandColor);
  const [accent, setAccent] = useState(props.accentColor ?? props.brandColor);
  const [sameAccent, setSameAccent] = useState(props.accentColor === null);
  const [font, setFont] = useState<FontKey>(props.font);

  const style = tenantStyle({
    brand_color: brand,
    accent_color: sameAccent ? null : accent,
    font,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Color principal
          <span className="flex items-center gap-3">
            <input
              name="brand_color"
              type="color"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <code dir="ltr" className="text-xs text-muted">{brand}</code>
          </span>
          <span className="text-xs font-normal text-muted">Botones y elementos principales.</span>
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium">
          <label htmlFor="accent_color">Color de acento</label>
          <span className="flex items-center gap-3">
            <input
              id="accent_color"
              name="accent_color"
              type="color"
              value={accent}
              disabled={sameAccent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-md border border-border bg-transparent disabled:opacity-40"
            />
            <code dir="ltr" className="text-xs text-muted">{sameAccent ? brand : accent}</code>
          </span>
          <label className="flex items-center gap-2 text-xs font-normal text-muted">
            <input
              type="checkbox"
              name="accent_same"
              checked={sameAccent}
              onChange={(e) => setSameAccent(e.target.checked)}
            />
            Usar el color principal
          </label>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Tipografía de los titulares</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {fontKeys.map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 transition has-[:checked]:border-cyan has-[:checked]:bg-cyan/10 hover:border-cyan/60 ${
                font === key ? "border-cyan" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="font"
                value={key}
                checked={font === key}
                onChange={() => setFont(key)}
                className="sr-only"
              />
              <span className="text-xl leading-tight" style={{ fontFamily: family(key) }}>
                Una iglesia es gente
              </span>
              <span className="text-xs text-muted">{fontLabels[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div
        style={style}
        className="relative isolate flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-6"
        aria-label="Vista previa"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          Vista previa
        </span>
        <h3
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Te damos la bienvenida a {props.churchName}
        </h3>
        <p className="text-muted">
          Registrarte nos ayuda a mantenernos en contacto. Tú decides qué compartes.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground">
            Regístrate
          </span>
          <span className="inline-flex items-center rounded-full border border-cyan/50 bg-cyan/10 px-4 py-2 text-sm font-medium text-cyan-soft">
            Acento
          </span>
        </div>
      </div>
    </div>
  );
}
