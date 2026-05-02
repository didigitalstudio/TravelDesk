"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SERVICE_LABELS, SERVICE_OPTIONS, type ServiceType } from "@/lib/requests";
import { ClientPicker, type ClientPickerData } from "./client-picker";

export type RequestFormState = { status: "idle" | "error"; message?: string };

export type RequestFormInitial = {
  client_id?: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  flexible_dates: boolean;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  services: ServiceType[];
  notes: string | null;
};

type Operator = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  agencyId: string;
  action: (prev: RequestFormState, formData: FormData) => Promise<RequestFormState>;
  initial?: RequestFormInitial;
  operators?: Operator[];
  hiddenFields?: Record<string, string>;
};

const initialState: RequestFormState = { status: "idle" };

export function RequestForm({
  mode,
  agencyId,
  action,
  initial,
  operators,
  hiddenFields,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [flexible, setFlexible] = useState(initial?.flexible_dates ?? false);
  const [sendNow, setSendNow] = useState(mode === "create" && (operators?.length ?? 0) > 0);

  const initialClientId = initial?.client_id ?? null;
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [clientName, setClientName] = useState(initial?.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.client_email ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.client_phone ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [departureDate, setDepartureDate] = useState(initial?.departure_date ?? "");
  const [returnDate, setReturnDate] = useState(initial?.return_date ?? "");
  const [paxAdults, setPaxAdults] = useState(String(initial?.pax_adults ?? 1));
  const [paxChildren, setPaxChildren] = useState(String(initial?.pax_children ?? 0));
  const [paxInfants, setPaxInfants] = useState(String(initial?.pax_infants ?? 0));
  const [services, setServices] = useState<Set<ServiceType>>(
    () => new Set(initial?.services ?? []),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const isEdit = mode === "edit";
  // Si el form arrancó con un client linkeado y el user lo limpió, se manda como
  // un signal explícito para desvincular. Si el form arrancó sin cliente, esto
  // queda false aunque el state sea null (no hay nada que desvincular).
  const clientCleared = initialClientId !== null && clientId === null;

  function handleClientPick(c: ClientPickerData | null) {
    if (c) {
      setClientId(c.id);
      setClientName(c.fullName);
      setClientEmail(c.email ?? "");
      setClientPhone(c.phone ?? "");
    } else {
      setClientId(null);
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <input type="hidden" name="client_id" value={clientId ?? ""} />
      <input type="hidden" name="client_cleared" value={clientCleared ? "1" : ""} />
      <Section title="Cliente final">
        <ClientPicker
          agencyId={agencyId}
          initialClientId={initial?.client_id ?? null}
          initialFullName={initial?.client_name}
          onPick={handleClientPick}
        />
        <Field id="client_name" label="Nombre del cliente" required>
          <input
            id="client_name"
            name="client_name"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
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
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@email.com"
              className={inputCls}
            />
          </Field>
          <Field id="client_phone" label="Teléfono del cliente">
            <input
              id="client_phone"
              name="client_phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
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
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
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
              value={departureDate ?? ""}
              onChange={(e) => setDepartureDate(e.target.value)}
              disabled={flexible}
              className={`${inputCls} disabled:opacity-40`}
            />
          </Field>
          <Field id="return_date" label="Fecha vuelta">
            <input
              id="return_date"
              name="return_date"
              type="date"
              value={returnDate ?? ""}
              onChange={(e) => setReturnDate(e.target.value)}
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
              value={paxAdults}
              onChange={(e) => setPaxAdults(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="pax_children" label="Niños">
            <input
              id="pax_children"
              name="pax_children"
              type="number"
              min={0}
              value={paxChildren}
              onChange={(e) => setPaxChildren(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="pax_infants" label="Infantes">
            <input
              id="pax_infants"
              name="pax_infants"
              type="number"
              min={0}
              value={paxInfants}
              onChange={(e) => setPaxInfants(e.target.value)}
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
                checked={services.has(s)}
                onChange={(e) => {
                  setServices((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(s);
                    else next.delete(s);
                    return next;
                  });
                }}
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Categoría preferida, presupuesto, observaciones del cliente…"
          className={`${inputCls} min-h-[88px] resize-y`}
        />
      </Section>

      {!isEdit && operators && (
        <Section title="Envío a operadores">
          {operators.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-amber-900 dark:text-amber-200">
                Todavía no tenés operadores vinculados. La solicitud se va a guardar como
                borrador y la podés enviar después.
              </p>
              <Link
                href="/agency/settings/operators"
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
      )}

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
          {pending
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : sendNow && (operators?.length ?? 0) > 0
                ? "Crear y enviar"
                : "Crear borrador"}
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
