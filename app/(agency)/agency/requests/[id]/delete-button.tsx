"use client";

import { useTransition } from "react";
import { deleteQuoteRequestAction } from "./edit/actions";

export function DeleteButton({ requestId, code }: { requestId: string; code: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `¿Eliminar definitivamente la solicitud ${code}? Se borra del expediente y deja de verse del lado del operador.`,
          )
        ) {
          start(async () => {
            try {
              await deleteQuoteRequestAction(requestId);
            } catch (e) {
              alert(e instanceof Error ? e.message : "Error al eliminar");
            }
          });
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
