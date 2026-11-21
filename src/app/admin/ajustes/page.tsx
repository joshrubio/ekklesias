import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { formPurposes, type FormPurpose } from "@/lib/consents";
import { purposeLabels } from "@/lib/admin-members";
import { isLocale, localeNames, locales, type Locale } from "@/i18n/config";
import { publishTextAction, updateChurchAction } from "@/app/admin/settings-actions";
import { QrPanel } from "@/components/qr-panel";
import { ThemeEditor } from "@/components/theme-editor";
import { ChurchAvatar } from "@/components/church-avatar";
import { removeLogoAction, uploadLogoAction } from "@/app/admin/logo-actions";
import { defaultFont, defaultMode, isFontKey, isThemeMode } from "@/lib/theme";
import { getSiteUrl } from "@/lib/mailer";
import { churchLink } from "@/lib/qr";

const messages: Record<string, string> = {
  nombre: "Escribe el nombre de la iglesia.",
  color: "El color no es válido.",
  fuente: "Elige una tipografía de la lista.",
  modo: "Elige modo claro u oscuro.",
  "logo-vacio": "Elige una imagen para el logo.",
  "logo-tamano": "El logo pesa más de 512 KB.",
  "logo-tipo": "El logo debe ser PNG, JPG o WebP.",
  "logo-subida": "No se pudo guardar el logo. Inténtalo de nuevo.",
  email: "Escribe un email de contacto válido.",
  guardar: "No se pudo guardar. Inténtalo de nuevo.",
  texto: "Elige un permiso y un idioma.",
  longitud: "El texto debe tener entre 20 y 4000 caracteres.",
  igual: "El texto es idéntico a la versión vigente: no hay nada que publicar.",
};

const field =
  "rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25";

export default async function SettingsPage({
  searchParams,
}: PageProps<"/admin/ajustes">) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    return <p className="text-muted">Solo los administradores cambian los ajustes.</p>;
  }

  const sp = await searchParams;
  const rawPurpose = Array.isArray(sp.purpose) ? sp.purpose[0] : sp.purpose;
  const rawLocale = Array.isArray(sp.locale) ? sp.locale[0] : sp.locale;
  const purpose: FormPurpose = (formPurposes as readonly string[]).includes(rawPurpose ?? "")
    ? (rawPurpose as FormPurpose)
    : "membership";
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "es";
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const saved = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;

  const site = await getSiteUrl();
  const supabase = await createUserClient();
  const [{ data: tenant }, { data: versions }] = await Promise.all([
    supabase
      .from("tenants")
      .select("name, brand_color, accent_color, font, theme_mode, logo_path, contact_email")
      .eq("id", session.tenant.id)
      .single(),
    supabase
      .from("consent_texts")
      .select("version, body, effective_from")
      .eq("tenant_id", session.tenant.id)
      .eq("purpose", purpose)
      .eq("locale", locale)
      .order("version", { ascending: false }),
  ]);

  const current = versions?.[0];

  return (
    <main className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {messages[error] ?? "Algo ha fallado."}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {saved === "texto" ? "Nueva versión publicada." : saved === "logo" ? "Logo actualizado." : "Cambios guardados."}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Logo</h2>
        <p className="text-sm text-muted">PNG, JPG o WebP, de hasta 512 KB. Mejor cuadrado.</p>
        <div className="flex flex-wrap items-center gap-4">
          <ChurchAvatar name={tenant?.name ?? ""} logoPath={tenant?.logo_path} className="size-20" />
          <form action={uploadLogoAction} className="flex flex-wrap items-center gap-3">
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="max-w-xs text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
            <button type="submit" className="rounded-full bg-brand glow-btn px-5 py-2 text-sm font-semibold text-brand-foreground">
              Subir logo
            </button>
          </form>
          {tenant?.logo_path ? (
            <form action={removeLogoAction}>
              <button type="submit" className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-cyan">
                Quitar logo
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">La iglesia</h2>
        <form action={updateChurchAction} className="flex max-w-3xl flex-col gap-5">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nombre
            <input name="name" defaultValue={tenant?.name} required maxLength={80} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email de contacto (aparece en las páginas legales)
            <input name="contact_email" type="email" defaultValue={tenant?.contact_email} required className={field} />
          </label>
          <ThemeEditor
            churchName={tenant?.name ?? ""}
            brandColor={tenant?.brand_color ?? "#22d3ee"}
            accentColor={tenant?.accent_color ?? null}
            font={isFontKey(tenant?.font) ? tenant.font : defaultFont}
            mode={isThemeMode(tenant?.theme_mode) ? tenant.theme_mode : defaultMode}
          />
          <button type="submit" className="self-start rounded-full bg-brand glow-btn px-4 py-2 text-base font-semibold text-brand-foreground">
            Guardar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Textos legales de los permisos</h2>
        <p className="text-sm text-muted">
          Cada cambio crea una versión nueva. Las personas ya registradas conservan
          constancia del texto exacto que aceptaron; la versión nueva solo se muestra a
          quien se registre o cambie sus permisos a partir de ahora.
        </p>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Permiso
            <select name="purpose" defaultValue={purpose} className={field}>
              {formPurposes.map((p) => (
                <option key={p} value={p}>
                  {purposeLabels[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Idioma
            <select name="locale" defaultValue={locale} className={field}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-md border border-black/20 px-4 py-2 text-base dark:border-white/25">
            Ver
          </button>
        </form>

        <form action={publishTextAction} className="flex flex-col gap-3">
          <input type="hidden" name="purpose" value={purpose} />
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            {current ? `Versión vigente: v${current.version}` : "Sin texto en este idioma todavía"}
            <textarea
              name="body"
              rows={8}
              dir={locale === "ar" ? "rtl" : "ltr"}
              defaultValue={current?.body ?? ""}
              required
              minLength={20}
              maxLength={4000}
              className={field}
            />
          </label>
          <button type="submit" className="self-start rounded-full bg-brand glow-btn px-4 py-2 text-base font-semibold text-brand-foreground">
            Publicar nueva versión
          </button>
        </form>

        {versions && versions.length > 1 ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Versiones anteriores</summary>
            <ul className="mt-2 flex flex-col gap-3">
              {versions.slice(1).map((v) => (
                <li key={v.version} className="rounded-md border border-black/10 p-3 dark:border-white/15">
                  <div className="mb-1 text-muted">
                    v{v.version} · {new Date(v.effective_from).toLocaleDateString("es-ES")}
                  </div>
                  <p dir={locale === "ar" ? "rtl" : "ltr"} className="whitespace-pre-wrap">
                    {v.body}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <QrPanel
        title="Registro general de la iglesia"
        help="Un QR o una etiqueta para carteles, redes o la entrada. Quien lo use se registra sin invitador."
        basePath="/admin/qr/iglesia"
        qrUrl={churchLink(site, session.tenant.slug, "qr")}
        nfcUrl={churchLink(site, session.tenant.slug, "nfc")}
      />
    </main>
  );
}
