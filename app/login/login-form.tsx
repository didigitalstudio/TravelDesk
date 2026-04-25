"use client";

import { useActionState, useState } from "react";
import {
  requestMagicLink,
  signInWithPassword,
  type LoginState,
  type PasswordLoginState,
} from "./actions";

const magicInitial: LoginState = { status: "idle" };
const passwordInitial: PasswordLoginState = { status: "idle" };

type Mode = "password" | "magic";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [magicState, magicAction, magicPending] = useActionState(
    requestMagicLink,
    magicInitial,
  );
  const [pwdState, pwdAction, pwdPending] = useActionState(
    signInWithPassword,
    passwordInitial,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-xs font-medium dark:bg-zinc-800">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "password"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Email + contraseña
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "magic"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Link mágico
        </button>
      </div>

      {mode === "password" ? (
        <form action={pwdAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={pwdState.email}
              placeholder="vos@agencia.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {pwdState.status === "error" && pwdState.message && (
            <p className="text-sm text-red-600 dark:text-red-400">{pwdState.message}</p>
          )}
          <button
            type="submit"
            disabled={pwdPending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {pwdPending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      ) : magicState.status === "sent" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          Te enviamos el link a <strong>{magicState.email}</strong>. Revisá tu casilla
          (también spam) y hacé click para entrar.
        </div>
      ) : (
        <form action={magicAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={magicState.email}
              placeholder="vos@agencia.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {magicState.status === "error" && magicState.message && (
            <p className="text-sm text-red-600 dark:text-red-400">{magicState.message}</p>
          )}
          <button
            type="submit"
            disabled={magicPending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {magicPending ? "Enviando…" : "Enviar link mágico"}
          </button>
        </form>
      )}
    </div>
  );
}
