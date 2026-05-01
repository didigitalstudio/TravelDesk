"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  type ClientFormState,
  upsertClientAction,
} from "../actions";

export type ClientFormInitial = {
  id?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  birthDate?: string | null;
  address?: string | null;
  notes?: string | null;
};

const initialState: ClientFormState = { status: "idle" };

export function ClientForm({
  initial,
  mode,
}: {
  initial?: ClientFormInitial;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(
    upsertClientAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Section title="Datos del cliente">
        <Field id="full_name" label="Nombre completo" required>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={initial?.fullName ?? ""}
            placeholder="Juan Pérez"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="cliente@email.com"
              className={inputCls}
            />
          </Field>
          <Field id="phone" label="Teléfono">
            <input
              id="phone"
              name="phone"
              defaultValue={initial?.phone ?? ""}
              placeholder="+54 9 11 5555 5555"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="document_type" label="Tipo de documento">
            <input
              id="document_type"
              name="document_type"
              defaultValue={initial?.documentType ?? ""}
              placeholder="DNI / Pasaporte"
              className={inputCls}
            />
          </Field>
          <Field id="document_number" label="Número">
            <input
              id="document_number"
              name="document_number"
              defaultValue={initial?.documentNumber ?? ""}
              placeholder="12345678"
              className={inputCls}
            />
          </Field>
          <Field id="birth_date" label="Fecha de nacimiento">
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={initial?.birthDate ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
        <Field id="address" label="Dirección">
          <input
            id="address"
            name="address"
            defaultValue={initial?.address ?? ""}
            placeholder="Av. Corrientes 1234, CABA"
            className={inputCls}
          />
        </Field>
        <Field id="notes" label="Notas">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder="Preferencias, observaciones, contactos secundarios…"
            className={`${inputCls} min-h-[88px] resize-y`}
          />
        </Field>
      </Section>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={initial?.id ? `/agency/clients/${initial.id}` : "/agency/clients"}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending ? "Guardando…" : mode === "create" ? "Crear cliente" : "Guardar cambios"}
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
