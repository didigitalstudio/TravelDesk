"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildAttachmentPath, formatBytes } from "@/lib/passengers";
import {
  PAYMENT_STAGE_LABELS,
  paymentStage,
  paymentStageBadgeClasses,
} from "@/lib/payments";
import { formatMoney, type Currency } from "@/lib/requests";
import {
  deletePaymentReceiptAttachment,
  getPaymentReceiptSignedUrl,
  registerPaymentReceipt,
  registerPaymentReceiptAttachment,
  unregisterPaymentReceipt,
} from "./actions";

export type PaymentReceiptAttachment = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  createdAt: string;
};

type Props = {
  agencyId: string;
  requestId: string;
  payment: {
    id: string;
    amount: number;
    currency: Currency;
    dueDate: string | null;
    receiptUploadedAt: string | null;
    verifiedAt: string | null;
    notes: string | null;
    operatorName: string;
  };
  receipts: PaymentReceiptAttachment[];
  requestStatus: string;
};

export function PaymentPanel({
  agencyId,
  requestId,
  payment,
  receipts,
  requestStatus,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const stage = paymentStage({
    receipt_uploaded_at: payment.receiptUploadedAt,
    verified_at: payment.verifiedAt,
  });
  const isVerified = stage === "verified";
  const canUpload = !isVerified && (requestStatus === "issued" || requestStatus === "payment_pending");
  const canConfirm =
    !isVerified &&
    requestStatus === "issued" &&
    receipts.length > 0;
  const canRevert = stage === "pending_verification" && requestStatus === "payment_pending";

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = buildAttachmentPath(agencyId, requestId, "payment_receipt", file.name);
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const res = await registerPaymentReceiptAttachment({
        requestId,
        storagePath: path,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      });
      if (!res.ok) {
        await supabase.storage.from("attachments").remove([path]);
        setError(res.message ?? "No se pudo registrar el comprobante.");
      }
    } finally {
      setUploading(false);
    }
  }

  function deleteReceipt(id: string) {
    if (!confirm("¿Borrar este comprobante?")) return;
    setError(null);
    start(async () => {
      const res = await deletePaymentReceiptAttachment(id, requestId);
      if (!res.ok) setError(res.message ?? "Error al borrar.");
    });
  }

  function confirmPayment() {
    if (!confirm("¿Confirmar que el pago fue realizado? El operador deberá verificarlo.")) return;
    setError(null);
    start(async () => {
      const res = await registerPaymentReceipt(requestId);
      if (!res.ok) setError(res.message ?? "Error al confirmar.");
    });
  }

  function revertConfirmation() {
    if (!confirm("¿Revertir la confirmación de pago? La solicitud vuelve a estado emitida.")) return;
    setError(null);
    start(async () => {
      const res = await unregisterPaymentReceipt(requestId);
      if (!res.ok) setError(res.message ?? "Error al revertir.");
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Pago al operador</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            A {payment.operatorName}
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
          label="Monto"
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
                ? `Confirmado ${new Date(payment.receiptUploadedAt).toLocaleDateString("es-AR")}`
                : "Sin pagar"
          }
        />
      </div>

      <div className="mb-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Comprobantes
          </span>
          {canUpload && (
            <label className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              {uploading ? "Subiendo…" : "+ Subir comprobante"}
              <input
                type="file"
                className="hidden"
                disabled={uploading || pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleFile(f);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}
        </div>
        {receipts.length === 0 ? (
          <p className="text-xs text-zinc-500">Sin comprobantes cargados.</p>
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
                    const res = await getPaymentReceiptSignedUrl(r.storagePath);
                    if (res.ok && res.url) window.open(res.url, "_blank");
                    else setError(res.message ?? "No se pudo abrir");
                  }}
                  className="truncate text-blue-600 hover:underline dark:text-blue-400"
                  title={r.fileName}
                >
                  {r.fileName}
                </button>
                <span className="flex items-center gap-2 text-zinc-500">
                  <span>{formatBytes(r.sizeBytes)}</span>
                  {!isVerified && (
                    <button
                      type="button"
                      onClick={() => deleteReceipt(r.id)}
                      className="rounded border border-zinc-200 px-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      ×
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canConfirm && (
          <button
            type="button"
            onClick={confirmPayment}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Confirmando…" : "Confirmar pago realizado"}
          </button>
        )}
        {canRevert && (
          <button
            type="button"
            onClick={revertConfirmation}
            disabled={pending}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Revertir confirmación
          </button>
        )}
        {payment.notes && (
          <span className="text-xs text-zinc-500">
            Nota del operador: {payment.notes}
          </span>
        )}
      </div>

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
