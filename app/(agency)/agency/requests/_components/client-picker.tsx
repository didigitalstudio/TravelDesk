"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ClientPickerData = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

type Props = {
  agencyId: string;
  initialClientId?: string | null;
  initialFullName?: string;
  onPick: (client: ClientPickerData | null) => void;
};

export function ClientPicker({
  agencyId,
  initialClientId,
  initialFullName,
  onPick,
}: Props) {
  const [clients, setClients] = useState<ClientPickerData[]>([]);
  const [query, setQuery] = useState(initialFullName ?? "");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ClientPickerData | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialRef = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id, full_name, email, phone")
      .eq("agency_id", agencyId)
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        const mapped = (data ?? []).map((c) => ({
          id: c.id,
          fullName: c.full_name,
          email: c.email,
          phone: c.phone,
        }));
        setClients(mapped);
        if (initialRef.current && initialClientId) {
          const c = mapped.find((x) => x.id === initialClientId);
          if (c) {
            setSelected(c);
            setQuery(c.fullName);
            onPick(c);
          }
        }
        initialRef.current = false;
      });
  }, [agencyId, initialClientId, onPick]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(c: ClientPickerData) {
    setSelected(c);
    setQuery(c.fullName);
    setOpen(false);
    onPick(c);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    onPick(null);
  }

  const lower = query.toLowerCase();
  const filtered = lower
    ? clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          (c.email ?? "").toLowerCase().includes(lower),
      )
    : clients;

  return (
    <div ref={containerRef} className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Cliente existente (opcional)</label>
        <Link
          href="/agency/clients/new"
          target="_blank"
          className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-200"
        >
          + Crear nuevo
        </Link>
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.fullName) {
              setSelected(null);
              onPick(null);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre o email…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute inset-y-0 right-2 my-auto h-fit text-xs text-zinc-500 hover:text-zinc-700"
            title="Quitar selección"
          >
            ×
          </button>
        )}
        {open && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">
                Sin resultados. Cargá los datos del cliente abajo.
              </p>
            ) : (
              <ul>
                {filtered.slice(0, 12).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div className="font-medium">{c.fullName}</div>
                      <div className="text-xs text-zinc-500">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {selected ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Cliente seleccionado: {selected.fullName}. Los campos de abajo se autocompletaron — podés editarlos.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Si lo dejás vacío, los datos se guardan solo como snapshot de esta solicitud.
        </p>
      )}
    </div>
  );
}
