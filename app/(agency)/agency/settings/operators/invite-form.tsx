"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { inviteOperatorByEmail, type InviteState } from "./actions";

const initialState: InviteState = { status: "idle" };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteOperatorByEmail, initialState);

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="email@operador.com"
          defaultValue={state.email}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending ? "Generando…" : "Generar invitación"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
      {state.status === "ok" && state.token && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/40">
          <div className="font-medium text-emerald-900 dark:text-emerald-200">
            Invitación creada para {state.email}
          </div>
          <p className="mt-1 text-emerald-900/80 dark:text-emerald-200/80">
            Compartí este link con el operador (mail, WhatsApp, etc.). Lo encontrás
            también abajo en &quot;Invitaciones pendientes&quot;.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${state.token}`}
              className="min-w-0 flex-1 truncate rounded-md border border-emerald-200 bg-white px-2 py-1 font-mono text-xs dark:border-emerald-900/40 dark:bg-zinc-950"
            />
            <CopyButton
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${state.token}`}
              label="Copiar"
            />
          </div>
        </div>
      )}
    </div>
  );
}
