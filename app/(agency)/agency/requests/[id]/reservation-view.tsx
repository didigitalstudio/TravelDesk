"use client";

import { useState, useTransition } from "react";
import { formatBytes } from "@/lib/passengers";
import { getAttachmentSignedUrl, setAttachmentShared } from "./passenger-actions";

export type ReservationData = {
  reservationCode: string;
  notes: string | null;
  operatorName: string;
  createdAt: string;
};

export type ReservationAttachment = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  sharedWithClient: boolean;
};

export function ReservationView({
  reservation,
  attachments,
  requestId,
}: {
  reservation: ReservationData;
  attachments: ReservationAttachment[];
  requestId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold">Reserva</h2>
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-base">{reservation.reservationCode}</span>
          <span className="text-xs text-zinc-500">
            por {reservation.operatorName} ·{" "}
            {new Date(reservation.createdAt).toLocaleString("es-AR")}
          </span>
        </div>
        {reservation.notes && (
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {reservation.notes}
          </p>
        )}
      </div>
      {attachments.length > 0 && (
        <div className="mt-3 rounded-md border border-zinc-100 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
            Comprobantes
          </div>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <ReservationAttachmentRow
                key={a.id}
                attachment={a}
                requestId={requestId}
                onError={setError}
              />
            ))}
          </ul>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </section>
  );
}

function ReservationAttachmentRow({
  attachment,
  requestId,
  onError,
}: {
  attachment: ReservationAttachment;
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
