"use client";

import { useState, useTransition } from "react";
import { ATTACHMENT_KIND_LABELS, type AttachmentKind } from "@/lib/passengers";
import {
  OperatorAttachmentsBlock,
  type OperatorAttachment,
} from "./operator-attachments-block";
import { markRequestIssued } from "./operator-actions";

const ISSUANCE_KINDS: AttachmentKind[] = ["voucher", "invoice", "file_doc"];

type Props = {
  agencyId: string;
  requestId: string;
  operatorId: string;
  attachmentsByKind: Partial<Record<AttachmentKind, OperatorAttachment[]>>;
  alreadyIssued: boolean;
  issuedAt: string | null;
};

export function IssuancePanel({
  agencyId,
  requestId,
  operatorId,
  attachmentsByKind,
  alreadyIssued,
  issuedAt,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    if (!window.confirm("¿Marcar la solicitud como emitida? La agencia ve el cambio inmediatamente."))
      return;
    setError(null);
    start(async () => {
      const res = await markRequestIssued(requestId);
      if (!res.ok) setError(res.message ?? "Error al marcar emitida.");
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Emisión</h2>
          {alreadyIssued && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Marcada emitida{" "}
              {issuedAt
                ? new Date(issuedAt).toLocaleString("es-AR")
                : ""}
            </p>
          )}
        </div>
        {!alreadyIssued && (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Marcando…" : "Marcar como emitida"}
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {ISSUANCE_KINDS.map((kind) => (
          <div
            key={kind}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {ATTACHMENT_KIND_LABELS[kind]}
            </div>
            <OperatorAttachmentsBlock
              agencyId={agencyId}
              requestId={requestId}
              operatorId={operatorId}
              kind={kind}
              attachments={attachmentsByKind[kind] ?? []}
              uploadLabel="+ Subir"
            />
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
