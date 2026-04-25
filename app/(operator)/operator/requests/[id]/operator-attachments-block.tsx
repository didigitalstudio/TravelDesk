"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildAttachmentPath,
  formatBytes,
  type AttachmentKind,
} from "@/lib/passengers";
import {
  deleteOperatorAttachment,
  registerOperatorAttachment,
} from "./operator-actions";
import { getOperatorAttachmentSignedUrl } from "./operator-attachments";

export type OperatorAttachment = {
  id: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  createdAt: string;
};

type Props = {
  agencyId: string;
  requestId: string;
  operatorId: string;
  kind: AttachmentKind;
  attachments: OperatorAttachment[];
  uploadLabel?: string;
};

export function OperatorAttachmentsBlock({
  agencyId,
  requestId,
  operatorId,
  kind,
  attachments,
  uploadLabel = "+ Subir archivo",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = buildAttachmentPath(agencyId, requestId, kind, file.name);
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const res = await registerOperatorAttachment({
        requestId,
        operatorId,
        kind,
        storagePath: path,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      });
      if (!res.ok) {
        await supabase.storage.from("attachments").remove([path]);
        setError(res.message ?? "No se pudo registrar el archivo.");
      }
    } finally {
      setUploading(false);
    }
  }

  function deleteOne(id: string) {
    if (!confirm("¿Borrar este archivo?")) return;
    setError(null);
    start(async () => {
      const res = await deleteOperatorAttachment(id, requestId);
      if (!res.ok) setError(res.message ?? "Error al borrar");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Archivos
        </span>
        <label className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {uploading ? "Subiendo…" : uploadLabel}
          <input
            type="file"
            className="hidden"
            disabled={uploading || pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleFile(f);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-zinc-500">Sin archivos.</p>
      ) : (
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
              <span className="flex items-center gap-2 text-zinc-500">
                <span>{formatBytes(a.sizeBytes)}</span>
                <button
                  type="button"
                  onClick={() => deleteOne(a.id)}
                  className="rounded border border-zinc-200 px-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
