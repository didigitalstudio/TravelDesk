"use client";

import { useTransition } from "react";
import { revokeInvitationAction, unlinkOperatorAction } from "./actions";

export function RevokeButton({ invitationId }: { invitationId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => revokeInvitationAction(invitationId))}
      className="self-start rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {pending ? "…" : "Revocar"}
    </button>
  );
}

export function UnlinkButton({ operatorId }: { operatorId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Desvincular este operador? Las solicitudes existentes no se borran.")) {
          start(() => unlinkOperatorAction(operatorId));
        }
      }}
      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {pending ? "…" : "Desvincular"}
    </button>
  );
}
