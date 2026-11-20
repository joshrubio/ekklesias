import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { createUserClient } from "@/lib/supabase/server";
import { ageFrom, memberColumns, purposeLabels, type MemberRow } from "@/lib/admin-members";
import type { FormPurpose } from "@/lib/consents";
import { MemberAdminTools } from "@/components/member-admin-tools";
import { confirmGuardianInPersonAction, resendGuardianEmailAction } from "@/app/admin/actions";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export default async function MemberPage({
  params,
  searchParams,
}: PageProps<"/admin/miembros/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const mail = Array.isArray(sp.mail) ? sp.mail[0] : sp.mail;
  if (!uuid.test(id)) notFound();

  const session = await getAdminSession();
  const supabase = await createUserClient();

  const { data } = await supabase
    .from("members")
    .select(memberColumns)
    .eq("id", id)
    .eq("tenant_id", session.tenant.id)
    .maybeSingle();
  if (!data) notFound();
  const m = data as MemberRow;

  const isAdmin = session.role === "admin";

  const [guardian, inviter, invited, events] = await Promise.all([
    isAdmin
      ? supabase.from("guardians").select("full_name, email, relationship, confirmed_at, confirmed_via, rejected_at").eq("member_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    m.invited_by
      ? supabase.from("members").select("id, first_name, last_name").eq("id", m.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("members").select("id, first_name, last_name, registered_at").eq("invited_by", id).order("registered_at"),
    isAdmin
      ? supabase
          .from("consent_events")
          .select("id, purpose, granted, source, given_by_guardian, recorded_at, consent_texts(version, locale)")
          .eq("member_id", id)
          .order("recorded_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  await supabase.from("access_log").insert({
    tenant_id: session.tenant.id,
    actor_user_id: session.userId,
    action: "view",
    entity: "member",
    entity_id: id,
  });

  const age = ageFrom(m.birth_date);
  const name = m.status === "erased" ? "(suprimido)" : `${m.first_name} ${m.last_name}`;

  return (
    <main className="flex flex-col gap-6">
      <Link href="/admin/miembros" className="text-sm underline">
        ← Miembros
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>

      <dl className="flex flex-col gap-2">
        <Row label="Email" value={m.email} />
        <Row label="Móvil" value={m.phone} />
        <Row
          label="Nacimiento"
          value={m.birth_date ? `${m.birth_date} (${age} años)` : null}
        />
        <Row label="Dirección" value={m.address} />
        <Row
          label="Bautizado"
          value={m.baptized === null ? null : m.baptized ? "Sí" : "No"}
        />
        <Row label="Idioma" value={m.locale} />
        <Row label="Alta" value={`${new Date(m.registered_at).toLocaleString("es-ES")} · ${m.registered_via.toUpperCase()}`} />
        <Row
          label="Quién le invitó"
          value={
            m.discovered_alone
              ? "Lo descubrió por su cuenta"
              : inviter.data
                ? (
                    <Link href={`/admin/miembros/${inviter.data.id}`} className="underline">
                      {inviter.data.first_name} {inviter.data.last_name}
                    </Link>
                  )
                : m.invited_by_text
          }
        />
        <Row label="Enlace personal" value={<code>/m/{m.invite_code}</code>} />
      </dl>

      {guardian.data ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Tutor</h2>
          <p>
            {guardian.data.full_name} ({guardian.data.relationship}) ·{" "}
            {guardian.data.email}
          </p>
          {guardian.data.confirmed_at ? (
            <p className="text-sm text-green-800 dark:text-green-300">
              Confirmado el {new Date(guardian.data.confirmed_at).toLocaleString("es-ES")} (
              {guardian.data.confirmed_via === "email" ? "por email" : "en persona"}).
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <p>
                {guardian.data.rejected_at
                  ? "El tutor ha rechazado el registro. Revísalo y, si procede, suprime al miembro."
                  : "Tutor sin confirmar: los permisos del menor no son efectivos y los líderes no lo ven."}
              </p>
              {mail === "sent" ? <p role="status">Email enviado al tutor.</p> : null}
              {mail === "failed" ? (
                <p role="alert">No se pudo enviar el email. Comprueba la configuración de correo.</p>
              ) : null}
              {mail === "error" ? <p role="alert">No se pudo confirmar.</p> : null}
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  <form action={resendGuardianEmailAction.bind(null, id)}>
                    <button type="submit" className="rounded-md border border-amber-700 px-3 py-2 font-medium">
                      Reenviar email al tutor
                    </button>
                  </form>
                  <form action={confirmGuardianInPersonAction.bind(null, id)}>
                    <button type="submit" className="rounded-md bg-amber-800 px-3 py-2 font-medium text-white">
                      Confirmar en persona
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          )}
          {mail === "confirmed" ? (
            <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
              Tutor confirmado en persona.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">A quién ha invitado</h2>
        {invited.data && invited.data.length > 0 ? (
          <ul className="list-disc ps-5">
            {invited.data.map((i) => (
              <li key={i.id}>
                <Link href={`/admin/miembros/${i.id}`} className="underline">
                  {i.first_name} {i.last_name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Todavía a nadie.</p>
        )}
      </section>

      {isAdmin && m.status === "active" ? (
        <MemberAdminTools memberId={m.id} name={name} />
      ) : null}

      {isAdmin ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Historial de consentimientos</h2>
          <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/10">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">Fecha</th>
                  <th className="px-3 py-2 text-start font-medium">Permiso</th>
                  <th className="px-3 py-2 text-start font-medium">Decisión</th>
                  <th className="px-3 py-2 text-start font-medium">Texto</th>
                  <th className="px-3 py-2 text-start font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {(events.data ?? []).map((e) => {
                  const text = e.consent_texts as unknown as { version: number; locale: string } | null;
                  return (
                    <tr key={e.id} className="border-t border-black/10 dark:border-white/15">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(e.recorded_at).toLocaleString("es-ES")}
                      </td>
                      <td className="px-3 py-2">{purposeLabels[e.purpose as FormPurpose]}</td>
                      <td className="px-3 py-2">
                        {e.granted ? "Aceptó" : "No aceptó / revocó"}
                        {e.given_by_guardian ? " (tutor)" : ""}
                      </td>
                      <td className="px-3 py-2">
                        {text ? `v${text.version} · ${text.locale}` : "—"}
                      </td>
                      <td className="px-3 py-2 uppercase">{e.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
