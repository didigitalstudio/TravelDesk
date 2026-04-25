"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createQuoteRequest, type NewRequestState } from "./actions";
import { SERVICE_LABELS, SERVICE_OPTIONS } from "@/lib/requests";

const initialState: NewRequestState = { status: "idle" };

type Operator = { id: string; name: string };

export function NewRequestForm({ operators }: { operators: Operator[] }) {
  const [state, formAction, pending] = useActionState(createQuoteRequest, initialState);
  const [flexible, setFlexible] = useState(false);
  const [sendNow, setSendNow] = useState(operators.length > 0);

  return (
    <form action={formAction} className="space-y-8">
      <Section title="Cliente final">
        <Field id="client_name" label="Nombre del cliente" required>
          <input
            id="client_name"
            name="client_name"
            required
            placeholder="Juan Pérez"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="client_email" label="Email del cliente">
            <input
              id="client_email"
              name="client_email"
              type="email"
              placeholder="cliente@email.com"
              className={inputCls}
            />
          </Field>
          <Field id="client_phone" label="Teléfono del cliente">
            <input
              id="client_phone"
              name="client_phone"
              placeholder="+54 9 11 5555 5555"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Viaje">
        <Field id="destination" label="Destino" required>
          <input
            id="destination"
            name="destination"
            required
            placeholder="Cancún, México"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="departure_date" label="Fecha ida">
            <input
              id="departure_date"
              name="departure_date"
              type="date"
              disabled={flexible}
              className={`${inputCls} disabled:opacity-40`}
            />
          </Field>
          <Field id="return_date" label="Fecha vuelta">
            <input
              id="return_date"
              name="return_date"
              type="date"
              disabled={flexible}
              className={`${inputCls} disabled:opacity-40`}
            />
          </Field>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="flexible_dates"
            checked={flexible}
            onChange={(e) => setFlexible(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Fechas flexibles
        </label>
      </Section>

      <Section title="Pasajeros">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="pax_adults" label="Adultos">
            <input
              id="pax_adults"
              name="pax_adults"
              type="number"
              min={0}
              defaultValue={1}
              className={inputCls}
            />
          </Field>
          <Field id="pax_children" label="Niños">
            <input
              id="pax_children"
              name="pax_children"
              type="number"
              min={0}
              defaultValue={0}
              className={inputCls}
            />
          </Field>
          <Field id="pax_infants" label="Infantes">
            <input
              id="pax_infants"
              name="pax_infants"
              type="number"
              min={0}
              defaultValue={0}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Servicios requeridos">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_OPTIONS.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                name="services"
                value={s}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {SERVICE_LABELS[s]}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Notas">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Categoría preferida, presupuesto, observaciones del cliente…"
          className={`${inputCls} min-h-[88px] resize-y`}
        />
      </Section>

      <Section title="Envío a operadores">
        {operators.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-amber-900 dark:text-amber-200">
              Todavía no tenés operadores vinculados. La solicitud se va a guardar como
              borrador y la podés enviar después.
            </p>
            <Link
              href="/agency/operators"
              className="mt-2 inline-block text-xs font-medium underline"
            >
              Ir a vincular operadores →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="send_now"
                checked={sendNow}
                onChange={(e) => setSendNow(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Enviar al guardar
            </label>
            <fieldset disabled={!sendNow} className="space-y-2 disabled:opacity-50">
              <legend className="text-xs uppercase tracking-wide text-zinc-500">
                Operadores
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {operators.map((op) => (
                  <label
                    key={op.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      name="operator_ids"
                      value={op.id}
                      defaultChecked
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    {op.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Section>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/agency/requests"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending ? "Guardando…" : sendNow && operators.length > 0 ? "Crear y enviar" : "Crear borrador"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
