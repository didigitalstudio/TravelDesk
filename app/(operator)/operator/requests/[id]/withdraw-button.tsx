"use client";

import { useTransition } from "react";
import { withdrawQuote } from "./actions";

export function WithdrawButton({
  quoteId,
  requestId,
}: {
  quoteId: string;
  requestId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Retirar esta cotización? La agencia dejará de verla como activa.")) {
          start(async () => {
            const res = await withdrawQuote(quoteId, requestId);
            if (!res.ok) alert(res.message ?? "Error al retirar");
          });
        }
      }}
      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {pending ? "Retirando…" : "Retirar"}
    </button>
  );
}
