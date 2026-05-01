"use client";

import { useActionState } from "react";
import {
  updateUserEmail,
  updateUserPassword,
  type AccountState,
} from "../actions";

const initial: AccountState = { status: "idle" };

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateUserEmail, initial);
  return (
    <form action={action} className="space-y-3">
      <Field label="Email actual">
        <input
          value={currentEmail}
          disabled
          className="input-base text-zinc-500"
        />
      </Field>
      <Field label="Email nuevo" htmlFor="new-email">
        <input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-base"
          placeholder="nuevo@example.com"
        />
      </Field>
      <p className="text-[11px] text-zinc-500">
        Vamos a mandarte un mail al nuevo email para confirmar el cambio. Hasta
        que lo confirmes, seguís entrando con el actual.
      </p>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Enviando…" : "Cambiar email"}
        </button>
        {state.status === "ok" && (
          <span className="text-xs text-emerald-300">{state.message}</span>
        )}
        {state.status === "error" && (
          <span className="text-xs text-rose-300">{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updateUserPassword, initial);
  return (
    <form action={action} className="space-y-3">
      <Field label="Nueva contraseña" htmlFor="pw-new">
        <input
          id="pw-new"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-base"
        />
      </Field>
      <Field label="Confirmar nueva contraseña" htmlFor="pw-confirm">
        <input
          id="pw-confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-base"
        />
      </Field>
      <p className="text-[11px] text-zinc-500">Mínimo 8 caracteres.</p>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Actualizando…" : "Cambiar contraseña"}
        </button>
        {state.status === "ok" && (
          <span className="text-xs text-emerald-300">{state.message}</span>
        )}
        {state.status === "error" && (
          <span className="text-xs text-rose-300">{state.message}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
