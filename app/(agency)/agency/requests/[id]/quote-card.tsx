"use client";

import { useMemo, useState, useTransition } from "react";
import {
  QUOTE_STATUS_LABELS,
  formatMoney,
  type Currency,
  type QuoteStatus,
} from "@/lib/requests";
import { acceptQuote, acceptQuoteItems, rejectQuote } from "./actions";

type Item = {
  id: string;
  description: string;
  amount: number;
  acceptedAt: string | null;
};

type Props = {
  quoteId: string;
  requestId: string;
  operatorName: string;
  status: QuoteStatus;
  totalAmount: number;
  currency: Currency;
  exchangeRate: number | null;
  validUntil: string | null;
  paymentTerms: string | null;
  notes: string | null;
  submittedAt: string;
  items: Item[];
  canActOnRequest: boolean;
};

export function QuoteCard({
  quoteId,
  requestId,
  operatorName,
  status,
  totalAmount,
  currency,
  exchangeRate,
  validUntil,
  paymentTerms,
  notes,
  submittedAt,
  items,
  canActOnRequest,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id)),
  );
  const [pdfOpen, setPdfOpen] = useState(false);
  const [marginValue, setMarginValue] = useState<string>("");
  const [marginType, setMarginType] = useState<"fixed" | "percent">("percent");

  function openPdf() {
    const value = Number.parseFloat(marginValue) || 0;
    const params = new URLSearchParams({
      quote_id: quoteId,
      margin: value.toString(),
      margin_type: marginType,
    });
    window.open(`/agency/requests/${requestId}/pdf?${params.toString()}`, "_blank");
  }

  const expired = validUntil ? new Date(validUntil) < new Date() : false;
  const isActive = status === "submitted";
  const isAccepted = status === "accepted";
  const acceptedItemsCount = items.filter((i) => i.acceptedAt).length;
  const partiallyAccepted =
    isAccepted && acceptedItemsCount > 0 && acceptedItemsCount < items.length;

  const selectedSum = useMemo(
    () =>
      items
        .filter((i) => selected.has(i.id))
        .reduce((acc, i) => acc + i.amount, 0),
    [items, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function doAcceptTotal() {
    if (!confirm(`¿Aceptar la cotización completa de ${operatorName}? Las otras quedan rechazadas.`)) return;
    setError(null);
    start(async () => {
      const res = await acceptQuote(quoteId, requestId);
      if (!res.ok) setError(res.message ?? "Error al aceptar.");
    });
  }

  function doAcceptPartial() {
    const ids = [...selected];
    if (ids.length === 0) {
      setError("Seleccioná al menos un ítem.");
      return;
    }
    if (!confirm(`¿Aceptar ${ids.length} ítem(s) de ${operatorName}? Las otras cotizaciones quedan rechazadas.`)) return;
    setError(null);
    start(async () => {
      const res = await acceptQuoteItems(quoteId, ids, requestId);
      if (!res.ok) setError(res.message ?? "Error al aceptar.");
    });
  }

  function doReject() {
    if (!confirm(`¿Rechazar la cotización de ${operatorName}?`)) return;
    setError(null);
    start(async () => {
      const res = await rejectQuote(quoteId, requestId);
      if (!res.ok) setError(res.message ?? "Error al rechazar.");
    });
  }

  const cardClasses =
    status === "accepted"
      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
      : status === "rejected"
        ? "border-zinc-200 bg-zinc-50/60 opacity-70 dark:border-zinc-800 dark:bg-zinc-950/40"
        : isActive
          ? "border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/10"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

  return (
    <article className={`rounded-2xl border p-5 ${cardClasses}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{operatorName}</span>
            <StatusPill status={status} partial={partiallyAccepted} />
          </div>
          <div className="text-xs text-zinc-500">
            Enviada {new Date(submittedAt).toLocaleString("es-AR")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tracking-tight">
            {formatMoney(totalAmount, currency)}
          </div>
          {exchangeRate && (
            <div className="text-xs text-zinc-500">
              TC{" "}
              {exchangeRate.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Validez</div>
          <div>
            {validUntil
              ? `${new Date(validUntil).toLocaleDateString("es-AR")}${expired ? " (vencida)" : ""}`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Pago</div>
          <div>{paymentTerms ?? "—"}</div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wider text-zinc-500">
            <span>Ítems</span>
            {partial && (
              <span className="text-[11px] normal-case tracking-normal">
                Seleccionados: {selected.size} ·{" "}
                {formatMoney(selectedSum, currency)}
              </span>
            )}
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((i) => {
              const checked = selected.has(i.id);
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm"
                >
                  <div className="flex flex-1 items-center gap-2">
                    {partial && isActive && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(i.id)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    )}
                    <span
                      className={
                        i.acceptedAt
                          ? "font-medium text-emerald-700 dark:text-emerald-400"
                          : isAccepted
                            ? "text-zinc-500 line-through"
                            : ""
                      }
                    >
                      {i.description}
                      {i.acceptedAt && (
                        <span className="ml-1 text-xs">✓ aceptado</span>
                      )}
                    </span>
                  </div>
                  <span className="font-mono">
                    {formatMoney(i.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {notes && (
        <div className="mt-3">
          <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Notas</div>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {notes}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {(isActive || isAccepted) && (
        <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {!pdfOpen ? (
            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Generar presupuesto cliente (PDF) →
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Presupuesto cliente
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={marginValue}
                  onChange={(e) => setMarginValue(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                <select
                  value={marginType}
                  onChange={(e) =>
                    setMarginType(e.target.value as "fixed" | "percent")
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="percent">% (sobre subtotal)</option>
                  <option value="fixed">{currency} (monto fijo)</option>
                </select>
                <button
                  type="button"
                  onClick={openPdf}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Generar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPdfOpen(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Margen no visible para el operador. Se abre en nueva pestaña.
              </p>
            </div>
          )}
        </div>
      )}

      {canActOnRequest && isActive && !expired && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {partial ? (
            <>
              <button
                type="button"
                onClick={() => setPartial(false)}
                disabled={pending}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancelar selección
              </button>
              <button
                type="button"
                onClick={doAcceptPartial}
                disabled={pending || selected.size === 0}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Aceptando…" : `Aceptar ${selected.size} ítem(s)`}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={doReject}
                disabled={pending}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Rechazar
              </button>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPartial(true)}
                  disabled={pending}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Aceptar parcial…
                </button>
              )}
              <button
                type="button"
                onClick={doAcceptTotal}
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Aceptando…" : "Aceptar total"}
              </button>
            </>
          )}
        </div>
      )}

      {expired && isActive && canActOnRequest && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Esta cotización está vencida. Pediéndole al operador que reenvíe.
        </p>
      )}
    </article>
  );
}

function StatusPill({
  status,
  partial,
}: {
  status: QuoteStatus;
  partial: boolean;
}) {
  const label = partial ? "Aceptada parcial" : QUOTE_STATUS_LABELS[status];
  const cls =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        : status === "submitted"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
