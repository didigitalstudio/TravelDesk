"use client";

import { useActionState, useState } from "react";
import { createTenant, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createTenant, initialState);
  const [kind, setKind] = useState<"agency" | "operator">("agency");

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="mb-2 block text-sm font-medium">¿Qué sos?</legend>
        <div className="grid grid-cols-2 gap-2">
          <label
            className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
              kind === "agency"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value="agency"
              checked={kind === "agency"}
              onChange={() => setKind("agency")}
              className="sr-only"
            />
            <div className="font-medium">Agencia</div>
            <div className="mt-0.5 text-xs opacity-80">Pido cotizaciones a operadores</div>
          </label>
          <label
            className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
              kind === "operator"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value="operator"
              checked={kind === "operator"}
              onChange={() => setKind("operator")}
              className="sr-only"
            />
            <div className="font-medium">Operador</div>
            <div className="mt-0.5 text-xs opacity-80">Recibo y cotizo solicitudes</div>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          {kind === "agency" ? "Nombre de la agencia" : "Nombre del operador"}
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder={kind === "agency" ? "Mi Agencia de Viajes" : "Operador Mayorista"}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {kind === "operator" && (
        <div>
          <label htmlFor="contact_email" className="mb-1.5 block text-sm font-medium">
            Email de contacto comercial <span className="text-zinc-400">(opcional)</span>
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            placeholder="ventas@operador.com"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            A esta dirección llegarán las solicitudes de cotización si la agencia te elige.
          </p>
        </div>
      )}

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {pending ? "Creando…" : "Crear workspace"}
      </button>
    </form>
  );
}
