"use client";

import { useState, useTransition } from "react";
import { disconnectDrive } from "./actions";

type Props = {
  connected: { folderName: string | null; connectedAt: string } | null;
};

export function IntegrationsPanel({ connected }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [state, setState] = useState(connected);

  function disconnect() {
    if (!confirm("¿Desconectar Google Drive? Los archivos ya sincronizados quedan en tu Drive.")) return;
    setError(null);
    start(async () => {
      const res = await disconnectDrive();
      if (!res.ok) setError(res.message ?? "Error");
      else setState(null);
    });
  }

  return (
    <div className="space-y-3">
      {state ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            Google Drive conectado
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Carpeta raíz: {state.folderName ?? "TravelDesk"} · conectado{" "}
            {new Date(state.connectedAt).toLocaleDateString("es-AR")}
          </p>
          <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
            Vas a poder sincronizar los archivos de cada solicitud al Drive desde el
            expediente.
          </p>
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <a
          href="/api/google/start"
          className="inline-block rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          Conectar Google Drive
        </a>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
