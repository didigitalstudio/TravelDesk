"use client";

import { useState, useTransition } from "react";
import {
  OperatorAttachmentsBlock,
  type OperatorAttachment,
} from "./operator-attachments-block";
import { upsertReservation } from "./operator-actions";

type Props = {
  agencyId: string;
  requestId: string;
  operatorId: string;
  initial: {
    reservationCode: string;
    notes: string | null;
    createdAt: string;
  } | null;
  attachments: OperatorAttachment[];
};

export function ReservationPanel({
  agencyId,
  requestId,
  operatorId,
  initial,
  attachments,
}: Props) {
  const [code, setCode] = useState(initial?.reservationCode ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [editing, setEditing] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    if (!code.trim()) {
      setError("Ingresá el código de reserva.");
      return;
    }
    start(async () => {
      const res = await upsertReservation(requestId, code, notes || undefined);
      if (!res.ok) setError(res.message ?? "Error al guardar.");
      else setEditing(false);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reserva</h2>
        {initial && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Código de reserva (PNR / file / locator) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="ABC123"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            {initial && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setCode(initial.reservationCode);
                  setNotes(initial.notes ?? "");
                  setError(null);
                }}
                disabled={pending}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {pending ? "Guardando…" : initial ? "Actualizar" : "Guardar reserva"}
            </button>
          </div>
        </div>
      ) : (
        initial && (
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Código
              </div>
              <div className="font-mono text-base">{initial.reservationCode}</div>
            </div>
            {initial.notes && (
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Notas</div>
                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {initial.notes}
                </p>
              </div>
            )}
            <div className="text-xs text-zinc-500">
              Cargada {new Date(initial.createdAt).toLocaleString("es-AR")}
            </div>
          </div>
        )
      )}

      {initial && !editing && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <OperatorAttachmentsBlock
            agencyId={agencyId}
            requestId={requestId}
            operatorId={operatorId}
            kind="reservation"
            attachments={attachments}
            uploadLabel="+ Comprobante"
          />
        </div>
      )}
    </section>
  );
}
