"use client";

import { useState, useTransition } from "react";
import { syncRequestToDrive } from "../../integrations/actions";

export function DriveSyncButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sync() {
    setInfo(null);
    setError(null);
    start(async () => {
      const res = await syncRequestToDrive(requestId);
      if (!res.ok) {
        setError(res.message ?? "Error");
        return;
      }
      const parts: string[] = [];
      if (res.synced) parts.push(`${res.synced} subidos`);
      if (res.skipped) parts.push(`${res.skipped} ya estaban`);
      if (res.failed && res.failed.length > 0) {
        parts.push(`${res.failed.length} fallidos`);
      }
      setInfo(parts.join(" · ") || "Sin archivos para sincronizar.");
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? "Sincronizando…" : "Sincronizar a Drive"}
      </button>
      {info && <span className="text-xs text-emerald-600">{info}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
