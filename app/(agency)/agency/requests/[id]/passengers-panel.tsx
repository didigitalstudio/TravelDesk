"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PASSENGER_TYPE_LABELS,
  PASSENGER_TYPE_OPTIONS,
  buildAttachmentPath,
  formatBytes,
  type PassengerType,
} from "@/lib/passengers";
import {
  deleteAttachment,
  deletePassenger,
  getAttachmentSignedUrl,
  registerAttachment,
  upsertPassenger,
  type PassengerInput,
} from "./passenger-actions";

export type PassengerRow = {
  id: string;
  fullName: string;
  passengerType: PassengerType;
  documentType: string | null;
  documentNumber: string | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  documentExpiryDate: string | null;
  nationality: string | null;
  city: string | null;
};

type ClientOption = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  birthDate: string | null;
  documentExpiryDate: string | null;
  nationality: string | null;
  city: string | null;
};

export type AttachmentRow = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

type Props = {
  agencyId: string;
  requestId: string;
  passengers: PassengerRow[];
  attachmentsByPassenger: Record<string, AttachmentRow[]>;
  canEdit: boolean;
};

export function PassengersPanel({
  agencyId,
  requestId,
  passengers,
  attachmentsByPassenger,
  canEdit,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select(
        "id, full_name, email, phone, document_type, document_number, birth_date, document_expiry_date, nationality, city",
      )
      .eq("agency_id", agencyId)
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        setClients(
          (data ?? []).map((c) => ({
            id: c.id,
            fullName: c.full_name,
            email: c.email,
            phone: c.phone,
            documentType: c.document_type,
            documentNumber: c.document_number,
            birthDate: c.birth_date,
            documentExpiryDate: c.document_expiry_date,
            nationality: c.nationality,
            city: c.city,
          })),
        );
      });
  }, [agencyId]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pasajeros</h2>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            + Agregar pasajero
          </button>
        )}
      </div>

      {adding && (
        <PassengerForm
          requestId={requestId}
          clients={clients}
          onClose={() => setAdding(false)}
        />
      )}

      {passengers.length === 0 && !adding ? (
        <p className="text-sm text-zinc-500">
          Todavía no hay pasajeros cargados.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {passengers.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              {editingId === p.id ? (
                <PassengerForm
                  requestId={requestId}
                  clients={clients}
                  initial={p}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <PassengerRowView
                  agencyId={agencyId}
                  requestId={requestId}
                  passenger={p}
                  attachments={attachmentsByPassenger[p.id] ?? []}
                  canEdit={canEdit}
                  onEdit={() => setEditingId(p.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PassengerRowView({
  agencyId,
  requestId,
  passenger,
  attachments,
  canEdit,
  onEdit,
}: {
  agencyId: string;
  requestId: string;
  passenger: PassengerRow;
  attachments: AttachmentRow[];
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doDelete() {
    if (!confirm(`¿Borrar pasajero ${passenger.fullName}? Se eliminan también sus documentos.`))
      return;
    setError(null);
    start(async () => {
      const res = await deletePassenger(passenger.id, requestId);
      if (!res.ok) setError(res.message ?? "Error al borrar");
    });
  }

  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {passenger.fullName}{" "}
            <span className="ml-1 text-xs font-normal text-zinc-500">
              · {PASSENGER_TYPE_LABELS[passenger.passengerType]}
            </span>
          </div>
          <div className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-zinc-500 sm:grid-cols-2">
            {passenger.documentNumber && (
              <span>
                {(passenger.documentType ?? "Doc")}: {passenger.documentNumber}
                {passenger.documentExpiryDate && (
                  <span className="ml-1 text-zinc-400">
                    (vto. {new Date(passenger.documentExpiryDate).toLocaleDateString("es-AR")})
                  </span>
                )}
              </span>
            )}
            {passenger.birthDate && (
              <span>
                Nac.: {new Date(passenger.birthDate).toLocaleDateString("es-AR")}
              </span>
            )}
            {passenger.nationality && <span>Nacionalidad: {passenger.nationality}</span>}
            {passenger.city && <span>{passenger.city}</span>}
            {passenger.email && <span>{passenger.email}</span>}
            {passenger.phone && <span>{passenger.phone}</span>}
          </div>
          {passenger.notes && (
            <p className="mt-1 text-xs text-zinc-500">{passenger.notes}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={doDelete}
              disabled={pending}
              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {pending ? "…" : "Borrar"}
            </button>
          </div>
        )}
      </header>

      <AttachmentsBlock
        agencyId={agencyId}
        requestId={requestId}
        passengerId={passenger.id}
        attachments={attachments}
        canUpload={canEdit}
      />

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function PassengerForm({
  requestId,
  clients,
  initial,
  onClose,
}: {
  requestId: string;
  clients: ClientOption[];
  initial?: PassengerRow;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [passengerType, setPassengerType] = useState<PassengerType>(
    initial?.passengerType ?? "adult",
  );
  const [documentType, setDocumentType] = useState(initial?.documentType ?? "DNI");
  const [documentNumber, setDocumentNumber] = useState(
    initial?.documentNumber ?? "",
  );
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [documentExpiryDate, setDocumentExpiryDate] = useState(
    initial?.documentExpiryDate ?? "",
  );
  const [nationality, setNationality] = useState(initial?.nationality ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickClient(c: ClientOption) {
    setFullName(c.fullName);
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
    setDocumentType(c.documentType ?? "DNI");
    setDocumentNumber(c.documentNumber ?? "");
    setBirthDate(c.birthDate ?? "");
    setDocumentExpiryDate(c.documentExpiryDate ?? "");
    setNationality(c.nationality ?? "");
    setCity(c.city ?? "");
    setPickerOpen(false);
    setPickerQuery("");
  }

  const lower = pickerQuery.toLowerCase();
  const filteredClients = lower
    ? clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          (c.documentNumber ?? "").toLowerCase().includes(lower) ||
          (c.email ?? "").toLowerCase().includes(lower),
      )
    : clients;

  function submit() {
    setError(null);
    if (!fullName.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const input: PassengerInput = {
      id: initial?.id,
      fullName,
      passengerType,
      documentType,
      documentNumber,
      birthDate,
      email,
      phone,
      notes,
      documentExpiryDate,
      nationality,
      city,
    };
    start(async () => {
      const res = await upsertPassenger(requestId, input);
      if (!res.ok) setError(res.message ?? "Error al guardar");
      else onClose();
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/40 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
      {!initial && clients.length > 0 && (
        <div ref={pickerRef} className="relative mb-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Cargar desde un cliente del CRM (opcional)
          </label>
          <input
            type="text"
            value={pickerQuery}
            onChange={(e) => {
              setPickerQuery(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Buscar por nombre, email o documento…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {pickerOpen && filteredClients.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <ul>
                {filteredClients.slice(0, 12).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickClient(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div className="font-medium">{c.fullName}</div>
                      <div className="text-xs text-zinc-500">
                        {[
                          c.documentNumber && `${c.documentType ?? "Doc"}: ${c.documentNumber}`,
                          c.email,
                          c.nationality,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" required>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Tipo">
          <select
            value={passengerType}
            onChange={(e) => setPassengerType(e.target.value as PassengerType)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PASSENGER_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {PASSENGER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de documento">
          <input
            type="text"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            placeholder="DNI / Pasaporte / etc."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Número">
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Vencimiento del documento">
          <input
            type="date"
            value={documentExpiryDate}
            onChange={(e) => setDocumentExpiryDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Nacionalidad">
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Argentina / Italiana / etc."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Localidad / Ciudad">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="CABA / Rosario / etc."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notas">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function AttachmentsBlock({
  agencyId,
  requestId,
  passengerId,
  attachments,
  canUpload,
}: {
  agencyId: string;
  requestId: string;
  passengerId: string;
  attachments: AttachmentRow[];
  canUpload: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = buildAttachmentPath(agencyId, requestId, "passenger_doc", file.name);
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const res = await registerAttachment({
        requestId,
        kind: "passenger_doc",
        storagePath: path,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
        passengerId,
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
    if (!confirm("¿Borrar este documento?")) return;
    setError(null);
    start(async () => {
      const res = await deleteAttachment(id, requestId);
      if (!res.ok) setError(res.message ?? "Error al borrar");
    });
  }

  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Documentos
        </span>
        {canUpload && (
          <label className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {uploading ? "Subiendo…" : "+ Subir"}
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
        )}
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-zinc-500">Sin documentos.</p>
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
                  const res = await getAttachmentSignedUrl(a.storagePath);
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
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => deleteOne(a.id)}
                    className="rounded border border-zinc-200 px-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    ×
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
