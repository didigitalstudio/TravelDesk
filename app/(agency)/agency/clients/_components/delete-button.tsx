"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteClientAction } from "../actions";

export function DeleteClientButton({
  clientId,
  fullName,
}: {
  clientId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doDelete() {
    if (
      !confirm(
        `¿Eliminar a ${fullName}? Las solicitudes históricas conservan los datos snapshot.`,
      )
    )
      return;
    setError(null);
    start(async () => {
      const res = await deleteClientAction(clientId);
      if (!res.ok) {
        setError(res.message ?? "Error al eliminar");
        return;
      }
      router.push("/agency/clients");
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={doDelete}
        disabled={pending}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {pending ? "Eliminando…" : "Eliminar cliente"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
