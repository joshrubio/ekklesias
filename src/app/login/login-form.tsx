"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const message = state.error ?? notice;

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-md border border-black/20 bg-transparent px-3 py-3 text-base dark:border-white/25"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-black/20 bg-transparent px-3 py-3 text-base dark:border-white/25"
        />
      </label>
      {message ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand glow-btn px-5 py-3 text-base font-semibold text-brand-foreground disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
