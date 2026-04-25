"use client";

import { useState } from "react";
import {
  PASSENGER_TYPE_LABELS,
  formatBytes,
  type PassengerType,
} from "@/lib/passengers";
import { getOperatorAttachmentSignedUrl } from "./operator-attachments";

export type PassengerView = {
  id: string;
  fullName: string;
  passengerType: PassengerType;
  documentType: string | null;
  documentNumber: string | null;
  birthDate: string | null;
};

export type AttachmentView = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
};

export function PassengersView({
  passengers,
  attachmentsByPassenger,
}: {
  passengers: PassengerView[];
  attachmentsByPassenger: Record<string, AttachmentView[]>;
}) {
  if (passengers.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Todavía no hay pasajeros cargados por la agencia.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {passengers.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="text-sm font-semibold">
            {p.fullName}
            <span className="ml-1 text-xs font-normal text-zinc-500">
              · {PASSENGER_TYPE_LABELS[p.passengerType]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500">
            {p.documentNumber && (
              <span>
                {(p.documentType ?? "Doc")}: {p.documentNumber}
              </span>
            )}
            {p.birthDate && (
              <span>
                Nac.: {new Date(p.birthDate).toLocaleDateString("es-AR")}
              </span>
            )}
          </div>
          <Files attachments={attachmentsByPassenger[p.id] ?? []} />
        </li>
      ))}
    </ul>
  );
}

function Files({ attachments }: { attachments: AttachmentView[] }) {
  const [error, setError] = useState<string | null>(null);
  if (attachments.length === 0) {
    return (
      <p className="mt-2 text-xs text-zinc-500">
        Sin documentos cargados todavía.
      </p>
    );
  }
  return (
    <div className="mt-2 rounded-md border border-zinc-100 bg-zinc-50/40 p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
      <ul className="space-y-1">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <button
              type="button"
              onClick={async () => {
                const res = await getOperatorAttachmentSignedUrl(a.storagePath);
                if (res.ok && res.url) window.open(res.url, "_blank");
                else setError(res.message ?? "No se pudo abrir");
              }}
              className="truncate text-blue-600 hover:underline dark:text-blue-400"
              title={a.fileName}
            >
              {a.fileName}
            </button>
            <span className="text-zinc-500">{formatBytes(a.sizeBytes)}</span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
