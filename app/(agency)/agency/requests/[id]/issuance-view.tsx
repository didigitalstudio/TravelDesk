"use client";

import { useState } from "react";
import { ATTACHMENT_KIND_LABELS, formatBytes, type AttachmentKind } from "@/lib/passengers";
import { getAttachmentSignedUrl } from "./passenger-actions";

export type IssuanceAttachment = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  kind: AttachmentKind;
};

const SECTIONS: AttachmentKind[] = ["voucher", "invoice", "file_doc"];

export function IssuanceView({
  attachments,
  issuedAt,
}: {
  attachments: IssuanceAttachment[];
  issuedAt: string | null;
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
                <ul className="space-y-1">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await getAttachmentSignedUrl(a.storagePath);
                          if (res.ok && res.url) window.open(res.url, "_blank");
                          else setError(res.message ?? "No se pudo abrir");
                        }}
                        className="truncate text-blue-600 hover:underline dark:text-blue-400"
                        title={a.fileName}
                      >
                        {a.fileName}
                      </button>
                      <span className="text-zinc-500">{formatBytes(a.sizeBytes)}</span>
                    </li>
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
