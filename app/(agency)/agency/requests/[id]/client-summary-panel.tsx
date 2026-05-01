"use client";

import { useState, useTransition } from "react";
import {
  generateClientSummaryToken,
  revokeClientSummaryToken,
  sendClientSummaryEmail,
} from "./actions";

type Props = {
  requestId: string;
  initialToken: string | null;
  baseUrl: string;
  clientEmail: string | null;
};

export function ClientSummaryPanel({
  requestId,
  initialToken,
  baseUrl,
  clientEmail,
}: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [emailTarget, setEmailTarget] = useState(clientEmail ?? "");

  const url = token ? `${baseUrl}/trip/${token}` : null;

  function generate() {
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await generateClientSummaryToken(requestId);
      if (!res.ok) {
        setError(res.message ?? "Error al generar el link.");
        return;
      }
      setToken(res.token ?? null);
    });
  }

  function revoke() {
    if (!confirm("¿Revocar el link público? El cliente ya no podrá acceder con la URL actual.")) return;
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await revokeClientSummaryToken(requestId);
      if (!res.ok) setError(res.message ?? "Error al revocar.");
      else setToken(null);
    });
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setInfo("Link copiado al portapapeles.");
    setTimeout(() => setInfo(null), 2500);
  }

  function sendByEmail() {
    if (!emailTarget.trim()) {
      setError("Indicá un email destinatario.");
      return;
    }
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await sendClientSummaryEmail(requestId, emailTarget.trim());
      if (!res.ok) setError(res.message ?? "No se pudo enviar.");
      else setInfo(`Mail enviado a ${emailTarget.trim()}.`);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Resumen para el cliente</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Link público read-only. Mostrá el itinerario, datos del viaje y reserva al cliente final.
          </p>
        </div>
        {!token ? (
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {pending ? "Generando…" : "Generar link"}
          </button>
        ) : (
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Revocar link
          </button>
        )}
      </div>

      {url && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
            <code className="flex-1 truncate text-xs">{url}</code>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Copiar
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Abrir
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value)}
              placeholder="cliente@email.com"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={sendByEmail}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {pending ? "Enviando…" : "Enviar por mail"}
            </button>
          </div>
        </div>
      )}

      {info && <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">{info}</p>}
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
