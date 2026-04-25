"use client";

import { useMemo, useState, useTransition } from "react";
import type { Currency } from "@/lib/requests";
import { submitQuote, type QuoteItemInput } from "./actions";

type Props = {
  requestId: string;
  mepSell: number | null;
  initial?: {
    totalAmount: number;
    currency: Currency;
    paymentTerms: string | null;
    validUntil: string | null;
    notes: string | null;
    exchangeRate: number | null;
    items: { description: string; amount: number }[];
  };
};

type ItemRow = { id: string; description: string; amount: string };

function newRow(): ItemRow {
  return {
    id: Math.random().toString(36).slice(2),
    description: "",
    amount: "",
  };
}

export function QuoteForm({ requestId, mepSell, initial }: Props) {
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "USD");
  const [totalAmount, setTotalAmount] = useState<string>(
    initial?.totalAmount != null ? String(initial.totalAmount) : "",
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    initial?.exchangeRate != null
      ? String(initial.exchangeRate)
      : mepSell != null
        ? String(mepSell)
        : "",
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(initial?.paymentTerms ?? "");
  const [validUntil, setValidUntil] = useState<string>(initial?.validUntil ?? "");
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    initial && initial.items.length > 0
      ? initial.items.map((i) => ({
          id: Math.random().toString(36).slice(2),
          description: i.description,
          amount: String(i.amount),
        }))
      : [newRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();

  const itemsSum = useMemo(
    () =>
      items.reduce((acc, r) => {
        const n = Number(r.amount);
        return acc + (Number.isFinite(n) && r.description.trim() ? n : 0);
      }, 0),
    [items],
  );

  const parsedTotal = Number(totalAmount);
  const parsedRate = Number(exchangeRate);
  const approxArsFromUsd =
    currency === "USD" && mepSell && Number.isFinite(parsedTotal)
      ? parsedTotal * mepSell
      : null;
  const approxUsdFromArs =
    currency === "ARS" && Number.isFinite(parsedRate) && parsedRate > 0 && Number.isFinite(parsedTotal)
      ? parsedTotal / parsedRate
      : null;

  function updateRow(id: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }
  function addRow() {
    setItems((prev) => [...prev, newRow()]);
  }

  function submit() {
    setError(null);
    setSuccess(false);
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      setError("Ingresá un total válido.");
      return;
    }
    if (currency === "ARS" && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
      setError("Ingresá un tipo de cambio válido para ARS.");
      return;
    }
    const cleanItems: QuoteItemInput[] = items
      .map((r) => ({ description: r.description.trim(), amount: Number(r.amount) }))
      .filter((r) => r.description.length > 0 && Number.isFinite(r.amount));

    start(async () => {
      const res = await submitQuote({
        requestId,
        totalAmount: parsedTotal,
        currency,
        paymentTerms: paymentTerms || undefined,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        exchangeRate: currency === "ARS" ? parsedRate : undefined,
        items: cleanItems,
      });
      if (!res.ok) {
        setError(res.message ?? "Error al enviar la cotización.");
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Moneda
        </span>
        <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 text-sm dark:border-zinc-700">
          {(["USD", "ARS"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={
                currency === c
                  ? "rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
                  : "rounded-md px-3 py-1 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {c}
            </button>
          ))}
        </div>
        {mepSell && (
          <span className="text-xs text-zinc-500">
            MEP de hoy: {mepSell.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS/USD
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Total (${currency})`} required>
          <input
            type="number"
            min={0}
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="0.00"
          />
          {approxArsFromUsd != null && (
            <p className="mt-1 text-xs text-zinc-500">
              ≈ {approxArsFromUsd.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS (al MEP)
            </p>
          )}
          {approxUsdFromArs != null && (
            <p className="mt-1 text-xs text-zinc-500">
              ≈ USD {approxUsdFromArs.toLocaleString("es-AR", { maximumFractionDigits: 2 })} (al tipo ingresado)
            </p>
          )}
        </Field>

        {currency === "ARS" && (
          <Field label="Tipo de cambio USD→ARS" required>
            <input
              type="number"
              min={0}
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Editable. Se guarda como referencia.
            </p>
          </Field>
        )}

        <Field label="Validez">
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>

        <Field label="Condiciones de pago">
          <input
            type="text"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="50% seña + saldo a 7 días, etc."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Ítems
          </span>
          <span className="text-xs text-zinc-500">
            Suma ítems: {itemsSum.toLocaleString("es-AR", { maximumFractionDigits: 2 })} {currency}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((row) => (
            <div key={row.id} className="flex items-start gap-2">
              <input
                type="text"
                value={row.description}
                onChange={(e) => updateRow(row.id, { description: e.target.value })}
                placeholder="Descripción (ej. Vuelo EZE-MIA ida y vuelta)"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={row.amount}
                onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                placeholder="0.00"
                className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={items.length <= 1}
                className="rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                title="Quitar ítem"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          + Agregar ítem
        </button>
      </div>

      <Field label="Notas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Cualquier detalle relevante para la agencia."
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && !error && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Cotización enviada.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending
            ? "Enviando…"
            : initial
              ? "Enviar nueva cotización (reemplaza la actual)"
              : "Enviar cotización"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
