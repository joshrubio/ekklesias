"use client";

import { useActionState } from "react";
import { createLinkAction, eraseMemberAction, type LinkState } from "@/app/admin/actions";

const initial: LinkState = {};

function LinkTool({
  memberId,
  kind,
  label,
  hint,
}: {
  memberId: string;
  kind: "preferences" | "unsubscribe";
  label: string;
  hint: string;
}) {
  const [state, action, pending] = useActionState(
    createLinkAction.bind(null, memberId, kind),
    initial,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-white/25"
        >
          {label}
        </button>
        <span className="text-sm text-muted">{hint}</span>
      </div>
      {state.url ? (
        <input
          readOnly
          value={state.url}
          dir="ltr"
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm dark:border-white/25"
        />
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function MemberAdminTools({ memberId, name }: { memberId: string; name: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Acciones</h2>
      <LinkTool
        memberId={memberId}
        kind="preferences"
        label="Enlace de preferencias"
        hint="Válido 7 días. Cópialo y envíaselo a la persona."
      />
      <LinkTool
        memberId={memberId}
        kind="unsubscribe"
        label="Enlace de baja"
        hint="Válido 30 días."
      />
      <form
        action={eraseMemberAction.bind(null, memberId)}
        className="flex flex-col gap-3 rounded-md border border-red-300 p-4 dark:border-red-800"
      >
        <h3 className="font-medium text-red-800 dark:text-red-300">Suprimir a {name}</h3>
        <p className="text-sm text-muted">
          Anonimiza los datos personales y retira todos los permisos. Se conserva el
          historial de consentimientos sin datos identificativos como prueba.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirm" required className="size-4" />
          Entiendo que no se puede deshacer.
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white"
        >
          Suprimir miembro
        </button>
      </form>
    </section>
  );
}
