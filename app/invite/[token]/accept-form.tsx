"use client";

import { useActionState } from "react";
import { acceptByToken, type AcceptState } from "./actions";

const initialState: AcceptState = { status: "idle" };

export function AcceptInvitationForm({ token }: { token: string }) {
  const action = acceptByToken.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {pending ? "Aceptando…" : "Aceptar invitación"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
