"use client";

import { useState, useTransition } from "react";
import { formatMoney, type Currency } from "@/lib/requests";
import { formatBytes } from "@/lib/passengers";
import {
  PAYMENT_STAGE_LABELS,
  paymentStage,
  paymentStageBadgeClasses,
} from "@/lib/payments";
import { verifyPayment } from "./operator-actions";
import { getOperatorAttachmentSignedUrl } from "./operator-attachments";

export type ReceiptView = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
};

type Props = {
  requestId: string;
  payment: {
    id: string;
    amount: number;
    currency: Currency;
    dueDate: string | null;
    receiptUploadedAt: string | null;
    verifiedAt: string | null;
    verifiedNotes: string | null;
    agencyName: string;
  };
  receipts: ReceiptView[];
};

export function PaymentVerifyPanel({ requestId, payment, receipts }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  const stage = paymentStage({
    receipt_uploaded_at: payment.receiptUploadedAt,
    verified_at: payment.verifiedAt,
  });
  const isVerified = stage === "verified";
  const canVerify = stage === "pending_verification";

  function confirmVerification() {
    if (!confirm("¿Verificar el pago como recibido? La solicitud queda cerrada.")) return;
    setError(null);
    start(async () => {
      const res = await verifyPayment(payment.id, requestId, notes || undefined);
      if (!res.ok) setError(res.message ?? "Error al verificar.");
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Pago de la agencia</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            De {payment.agencyName}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${paymentStageBadgeClasses(stage)}`}
        >
          {PAYMENT_STAGE_LABELS[stage]}
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Detail
          label="Monto a recibir"
          value={formatMoney(payment.amount, payment.currency)}
        />
        <Detail
          label="Vencimiento"
          value={
            payment.dueDate
              ? new Date(payment.dueDate).toLocaleDateString("es-AR")
              : "Sin vencimiento"
          }
        />
        <Detail
          label="Estado"
          value={
            payment.verifiedAt
              ? `Verificado ${new Date(payment.verifiedAt).toLocaleDateString("es-AR")}`
              : payment.receiptUploadedAt
                ? `Confirmado por agencia ${new Date(payment.receiptUploadedAt).toLocaleDateString("es-AR")}`
                : "Pendiente"
          }
        />
      </div>

      <div className="mb-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Comprobantes subidos
        </div>
        {receipts.length === 0 ? (
          <p className="text-xs text-zinc-500">Sin comprobantes.</p>
        ) : (
          <ul className="space-y-1">
            {receipts.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <button
                  type="button"
                  onClick={async () => {
                    const res = await getOperatorAttachmentSignedUrl(r.storagePath);
                    if (res.ok && res.url) window.open(res.url, "_blank");
                    else setError(res.message ?? "No se pudo abrir");
                  }}
                  className="truncate text-blue-600 hover:underline dark:text-blue-400"
                  title={r.fileName}
                >
                  {r.fileName}
                </button>
                <span className="text-zinc-500">{formatBytes(r.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canVerify && (
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: recibí transferencia el 30/04"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={confirmVerification}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Verificando…" : "Verificar pago y cerrar"}
          </button>
        </div>
      )}

      {isVerified && payment.verifiedNotes && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Notas: {payment.verifiedNotes}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
