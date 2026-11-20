import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { formPurposes, type FormPurpose } from "@/lib/consents";
import { purposeLabels } from "@/lib/admin-members";
import { isLocale, localeNames, locales, type Locale } from "@/i18n/config";
import { publishTextAction, updateChurchAction } from "@/app/admin/settings-actions";

const messages: Record<string, string> = {
  nombre: "Escribe el nombre de la iglesia.",
  color: "El color no es válido.",
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

  const supabase = await createUserClient();
  const [{ data: tenant }, { data: versions }] = await Promise.all([
    supabase
      .from("tenants")
      .select("name, brand_color, contact_email")
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
          {saved === "texto" ? "Nueva versión publicada." : "Cambios guardados."}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">La iglesia</h2>
        <form action={updateChurchAction} className="flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nombre
            <input name="name" defaultValue={tenant?.name} required maxLength={80} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email de contacto (aparece en las páginas legales)
            <input name="contact_email" type="email" defaultValue={tenant?.contact_email} required className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Color de marca
            <input name="brand_color" type="color" defaultValue={tenant?.brand_color} className="h-11 w-24 rounded-md border border-black/20 bg-transparent dark:border-white/25" />
          </label>
          <button type="submit" className="self-start rounded-md bg-brand px-4 py-2 text-base font-medium text-white">
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
          <button type="submit" className="self-start rounded-md bg-brand px-4 py-2 text-base font-medium text-white">
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
    </main>
  );
}
