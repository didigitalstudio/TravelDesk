"use client";

import { useState, useTransition } from "react";
import { cancelRequest } from "./actions";

export function CancelButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doCancel() {
    if (!confirm("¿Cancelar esta solicitud? La acción no se puede deshacer.")) return;
    setError(null);
    start(async () => {
      const res = await cancelRequest(requestId);
      if (!res.ok) setError(res.message ?? "Error al cancelar");
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={doCancel}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {pending ? "Cancelando…" : "Cancelar solicitud"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
