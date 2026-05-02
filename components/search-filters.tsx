"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export type FilterField =
  | { kind: "text"; name: string; placeholder?: string }
  | { kind: "select"; name: string; options: { value: string; label: string }[]; placeholder?: string }
  | { kind: "date"; name: string; placeholder?: string };

export function SearchFilters({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.name] = sp.get(f.name) ?? "";
    return v;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantener el estado en sync con la URL (e.g. clear, navegación back)
  useEffect(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.name] = sp.get(f.name) ?? "";
    setValues(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  function pushUpdate(next: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) {
      if (val.trim()) params.set(k, val.trim());
    }
    const qs = params.toString();
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onTextChange(name: string, val: string) {
    const next = { ...values, [name]: val };
    setValues(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUpdate(next), 300);
  }

  function onImmediateChange(name: string, val: string) {
    const next = { ...values, [name]: val };
    setValues(next);
    pushUpdate(next);
  }

  const hasAny = Object.values(values).some((v) => v.trim());

  return (
    <div className="surface-flat flex flex-wrap items-center gap-2 p-2">
      {fields.map((f) => {
        if (f.kind === "text") {
          return (
            <div key={f.name} className="relative flex-1 min-w-[180px]">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={values[f.name] ?? ""}
                onChange={(e) => onTextChange(f.name, e.target.value)}
                placeholder={f.placeholder ?? "Buscar…"}
                className="input-base !pl-8"
              />
            </div>
          );
        }
        if (f.kind === "select") {
          return (
            <select
              key={f.name}
              value={values[f.name] ?? ""}
              onChange={(e) => onImmediateChange(f.name, e.target.value)}
              className="input-base max-w-[200px]"
            >
              <option value="">{f.placeholder ?? "Todos"}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={f.name}
            type="date"
            value={values[f.name] ?? ""}
            onChange={(e) => onImmediateChange(f.name, e.target.value)}
            className="input-base max-w-[180px]"
            placeholder={f.placeholder}
          />
        );
      })}
      {hasAny && (
        <button
          type="button"
          onClick={() => {
            const cleared: Record<string, string> = {};
            for (const f of fields) cleared[f.name] = "";
            setValues(cleared);
            pushUpdate(cleared);
          }}
          className="btn-ghost text-xs"
          disabled={pending}
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
