"use client";

import { useState, useTransition } from "react";
import { deleteQuoteRequestAction } from "./edit/actions";

export function DeleteButton({ requestId, code }: { requestId: string; code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doDelete() {
    if (
      !confirm(
        `¿Eliminar definitivamente la solicitud ${code}? Se borra del expediente y deja de verse del lado del operador.`,
      )
    )
      return;
    setError(null);
    start(async () => {
      try {
        await deleteQuoteRequestAction(requestId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={doDelete}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
