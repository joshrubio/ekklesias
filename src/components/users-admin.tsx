"use client";

import { useActionState } from "react";
import {
  changeRoleAction,
  inviteUserAction,
  removeUserAction,
  resetPasswordAction,
  type CredentialState,
} from "@/app/admin/users-actions";

const initial: CredentialState = {};
const field =
  "rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25";

function Credentials({ state }: { state: CredentialState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {state.error}
      </p>
    );
  }
  if (!state.password) return null;
  return (
    <div role="status" className="flex flex-col gap-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p>
        Contraseña temporal de <strong>{state.email}</strong>. Solo se muestra ahora: cópiala
        y envíasela por un canal seguro. Deberá cambiarla en «Mi cuenta».
      </p>
      <input
        readOnly
        dir="ltr"
        value={state.password}
        onFocus={(e) => e.currentTarget.select()}
        className="rounded-md border border-amber-400 bg-white px-3 py-2 font-mono text-base text-black"
      />
    </div>
  );
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteUserAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Rol
          <select name="role" defaultValue="leader" className={field}>
            <option value="leader">Líder</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand glow-btn px-4 py-2 text-base font-semibold text-brand-foreground disabled:opacity-60"
        >
          Crear cuenta
        </button>
      </div>
      <Credentials state={state} />
    </form>
  );
}

export function UserRowActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: "admin" | "leader";
  isSelf: boolean;
}) {
  const [state, resetAction, pending] = useActionState(
    resetPasswordAction.bind(null, userId),
    initial,
  );

  if (isSelf) return <span className="text-sm text-muted">Tú</span>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={changeRoleAction.bind(null, userId)} className="flex items-center gap-2">
          <select name="role" defaultValue={role} aria-label="Rol" className={field}>
            <option value="leader">Líder</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="submit" className="rounded-md border border-black/20 px-3 py-2 text-sm dark:border-white/25">
            Cambiar
          </button>
        </form>
        <form action={resetAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-black/20 px-3 py-2 text-sm disabled:opacity-60 dark:border-white/25"
          >
            Restablecer contraseña
          </button>
        </form>
        <form action={removeUserAction.bind(null, userId)}>
          <button
            type="submit"
            className="rounded-md border border-red-400 px-3 py-2 text-sm text-red-800 dark:text-red-300"
          >
            Quitar
          </button>
        </form>
      </div>
      <Credentials state={state} />
    </div>
  );
}
