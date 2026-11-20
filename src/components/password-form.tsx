"use client";

import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "@/app/admin/users-actions";

const initial: PasswordState = {};
const field =
  "rounded-md border border-black/20 bg-transparent px-3 py-2 text-base dark:border-white/25";

const messages = {
  short: "Usa al menos 12 caracteres.",
  mismatch: "Las dos contraseñas no coinciden.",
  error: "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
} as const;

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nueva contraseña
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Repite la contraseña
        <input name="repeat" type="password" autoComplete="new-password" required minLength={12} className={field} />
      </label>
      {state.status === "ok" ? (
        <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
          Contraseña cambiada.
        </p>
      ) : null}
      {state.status && state.status !== "ok" ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {messages[state.status]}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-60"
      >
        Cambiar contraseña
      </button>
    </form>
  );
}
