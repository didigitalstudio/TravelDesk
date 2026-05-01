"use client";

import { useState, useTransition } from "react";
import { generateTelegramLinkCode, unlinkTelegram } from "./actions";

type Props = {
  botUsername: string;
  initialLink: { chatId: string; username: string | null; createdAt: string } | null;
};

export function TelegramPanel({ botUsername, initialLink }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [link, setLink] = useState(initialLink);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    setCode(null);
    start(async () => {
      const res = await generateTelegramLinkCode();
      if (!res.ok) setError(res.message ?? "Error");
      else setCode(res.code ?? null);
    });
  }

  function unlink() {
    if (!confirm("¿Desvincular Telegram? Los comandos del bot dejarán de funcionar.")) return;
    setError(null);
    start(async () => {
      const res = await unlinkTelegram();
      if (!res.ok) setError(res.message ?? "Error");
      else setLink(null);
    });
  }

  return (
    <div className="space-y-4">
      {link ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            Telegram vinculado{" "}
            {link.username ? `como @${link.username}` : `(chat #${link.chatId})`}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Vinculado desde {new Date(link.createdAt).toLocaleDateString("es-AR")}
          </p>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Desvincular
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Abrí Telegram y buscá{" "}
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                @{botUsername}
              </a>{" "}
              (o escaneá el bot).
            </li>
            <li>Generá tu código de vinculación abajo.</li>
            <li>
              Mandale al bot: <code>/vincular CODIGO</code>
            </li>
          </ol>
        </div>
      )}

      {!link && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {pending ? "Generando…" : "Generar código de vinculación"}
          </button>
          {code && (
            <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-white p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Tu código (vence en 15 minutos)
              </div>
              <div className="mt-2 font-mono text-3xl font-bold tracking-widest">
                {code}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Mandá <code>/vincular {code}</code> a{" "}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  @{botUsername}
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
