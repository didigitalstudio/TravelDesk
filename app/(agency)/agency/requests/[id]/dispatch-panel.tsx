"use client";

import { useState, useTransition } from "react";
import { dispatchToOperators } from "./actions";

type Operator = { id: string; name: string };

export function DispatchPanel({
  requestId,
  operators,
}: {
  requestId: string;
  operators: Operator[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(operators.map((o) => o.id)),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await dispatchToOperators(requestId, [...selected]);
      if (!res.ok) setError(res.message ?? "Error desconocido");
    });
  }

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Enviar a más operadores
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {operators.map((op) => (
          <label
            key={op.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={selected.has(op.id)}
              onChange={() => toggle(op.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            {op.name}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={pending || selected.size === 0}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending ? "Enviando…" : `Enviar (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
