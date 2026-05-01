"use client";

import { useState, useTransition } from "react";
import { ATTACHMENT_KIND_LABELS, formatBytes, type AttachmentKind } from "@/lib/passengers";
import { getAttachmentSignedUrl, setAttachmentShared } from "./passenger-actions";

export type IssuanceAttachment = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  kind: AttachmentKind;
  sharedWithClient: boolean;
};

const SECTIONS: AttachmentKind[] = ["voucher", "invoice", "file_doc"];

export function IssuanceView({
  attachments,
  issuedAt,
  requestId,
}: {
  attachments: IssuanceAttachment[];
  issuedAt: string | null;
  requestId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const grouped: Record<string, IssuanceAttachment[]> = {};
  for (const a of attachments) {
    (grouped[a.kind] ??= []).push(a);
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Documentos del operador</h2>
        {issuedAt && (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            Emitida {new Date(issuedAt).toLocaleString("es-AR")}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Marcá cuáles compartir con el cliente final desde el resumen público.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((kind) => {
          const items = grouped[kind] ?? [];
          return (
            <div
              key={kind}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                {ATTACHMENT_KIND_LABELS[kind]}
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-500">Sin archivos.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((a) => (
                    <AttachmentRow
                      key={a.id}
                      attachment={a}
                      requestId={requestId}
                      onError={setError}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

function AttachmentRow({
  attachment,
  requestId,
  onError,
}: {
  attachment: IssuanceAttachment;
  requestId: string;
  onError: (msg: string | null) => void;
}) {
  const [shared, setShared] = useState(attachment.sharedWithClient);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={async () => {
            const res = await getAttachmentSignedUrl(attachment.storagePath);
            if (res.ok && res.url) window.open(res.url, "_blank");
            else onError(res.message ?? "No se pudo abrir");
          }}
          className="truncate text-blue-600 hover:underline dark:text-blue-400"
          title={attachment.fileName}
        >
          {attachment.fileName}
        </button>
        <span className="text-zinc-500">{formatBytes(attachment.sizeBytes)}</span>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={shared}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setShared(next);
            startTransition(async () => {
              const res = await setAttachmentShared(attachment.id, next, requestId);
              if (!res.ok) {
                setShared(!next);
                onError(res.message ?? "No se pudo actualizar");
              }
            });
          }}
        />
          Compartir con el cliente
      </label>
    </li>
  );
}
