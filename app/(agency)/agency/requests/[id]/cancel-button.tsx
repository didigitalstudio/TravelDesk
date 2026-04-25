"use client";

import { useTransition } from "react";
import { cancelRequest } from "./actions";

export function CancelButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Cancelar esta solicitud? La acción no se puede deshacer.")) {
          start(async () => {
            const res = await cancelRequest(requestId);
            if (!res.ok) alert(res.message ?? "Error al cancelar");
          });
        }
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
    >
      {pending ? "Cancelando…" : "Cancelar solicitud"}
    </button>
  );
}
