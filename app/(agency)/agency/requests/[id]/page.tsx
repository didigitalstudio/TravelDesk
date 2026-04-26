import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { BspBadge } from "@/components/bsp-badge";
import {
  SERVICE_LABELS,
  STATUS_LABELS,
  formatDateRange,
  paxBreakdown,
  totalPax,
} from "@/lib/requests";
import { DispatchPanel } from "./dispatch-panel";
import { CancelButton } from "./cancel-button";
import { DeleteButton } from "./delete-button";
import { QuoteCard } from "./quote-card";
import {
  PassengersPanel,
  type AttachmentRow,
  type PassengerRow,
} from "./passengers-panel";
import {
  ReservationView,
  type ReservationAttachment,
} from "./reservation-view";
import { IssuanceView, type IssuanceAttachment } from "./issuance-view";

export const metadata = { title: "Solicitud — Travel Desk" };

type Params = { id: string };

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();

  const { data: request } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .eq("agency_id", tenant.agencyId)
    .maybeSingle();

  if (!request) notFound();

  const [
    { data: dispatches },
    { data: history },
    { data: links },
    { data: quotes },
  ] = await Promise.all([
    supabase
      .from("quote_request_dispatches")
      .select("id, sent_at, operator:operators!inner(id, name)")
      .eq("quote_request_id", id)
      .order("sent_at", { ascending: false }),
    supabase
      .from("quote_request_status_history")
      .select("id, from_status, to_status, changed_at, notes")
      .eq("quote_request_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("agency_operator_links")
      .select("operator:operators!inner(id, name)")
      .eq("agency_id", tenant.agencyId),
    supabase
      .from("quotes")
      .select(
        "*, operator:operators!inner(id, name), items:quote_items(id, sort_order, description, amount, accepted_at)",
      )
      .eq("quote_request_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  const acceptanceReached =
    request.status === "accepted" ||
    request.status === "partially_accepted" ||
    request.status === "reserved" ||
    request.status === "docs_uploaded" ||
    request.status === "issued" ||
    request.status === "payment_pending" ||
    request.status === "closed";

  const [
    { data: passengersRaw },
    { data: attachmentsRaw },
    { data: reservationRow },
  ] = await Promise.all([
    acceptanceReached
      ? supabase
          .from("passengers")
          .select(
            "id, full_name, passenger_type, document_type, document_number, birth_date, email, phone, notes",
          )
          .eq("quote_request_id", id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    acceptanceReached
      ? supabase
          .from("attachments")
          .select(
            "id, file_name, storage_path, mime_type, size_bytes, created_at, kind, passenger_id",
          )
          .eq("quote_request_id", id)
          .in("kind", [
            "passenger_doc",
            "reservation",
            "voucher",
            "invoice",
            "file_doc",
          ])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    acceptanceReached
      ? supabase
          .from("reservations")
          .select(
            "id, reservation_code, notes, created_at, operator:operators!inner(id, name)",
          )
          .eq("quote_request_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const passengers: PassengerRow[] = (passengersRaw ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    passengerType: p.passenger_type,
    documentType: p.document_type,
    documentNumber: p.document_number,
    birthDate: p.birth_date,
    email: p.email,
    phone: p.phone,
    notes: p.notes,
  }));

  const attachmentsByPassenger: Record<string, AttachmentRow[]> = {};
  const reservationAttachments: ReservationAttachment[] = [];
  const issuanceAttachments: IssuanceAttachment[] = [];
  for (const a of attachmentsRaw ?? []) {
    if (a.kind === "passenger_doc") {
      if (!a.passenger_id) continue;
      const row: AttachmentRow = {
        id: a.id,
        fileName: a.file_name,
        storagePath: a.storage_path,
        mimeType: a.mime_type,
        sizeBytes: a.size_bytes,
        createdAt: a.created_at,
      };
      (attachmentsByPassenger[a.passenger_id] ??= []).push(row);
    } else if (a.kind === "reservation") {
      reservationAttachments.push({
        id: a.id,
        fileName: a.file_name,
        storagePath: a.storage_path,
        sizeBytes: a.size_bytes,
      });
    } else if (
      a.kind === "voucher" ||
      a.kind === "invoice" ||
      a.kind === "file_doc"
    ) {
      issuanceAttachments.push({
        id: a.id,
        fileName: a.file_name,
        storagePath: a.storage_path,
        sizeBytes: a.size_bytes,
        kind: a.kind,
      });
    }
  }

  const showIssuanceView =
    acceptanceReached &&
    (issuanceAttachments.length > 0 ||
      request.status === "issued" ||
      request.status === "docs_uploaded" ||
      request.status === "payment_pending" ||
      request.status === "closed");

  const requestActionable =
    request.status !== "cancelled" &&
    request.status !== "closed" &&
    request.status !== "accepted" &&
    request.status !== "reserved" &&
    request.status !== "issued" &&
    request.status !== "docs_uploaded" &&
    request.status !== "payment_pending";

  const dispatchedIds = new Set((dispatches ?? []).map((d) => d.operator.id));
  const linkedOperators = (links ?? []).map((l) => l.operator);
  const availableForDispatch = linkedOperators.filter((op) => !dispatchedIds.has(op.id));

  const isCancelled = request.status === "cancelled";
  const isClosed = request.status === "closed";
  const canEditOrDelete =
    request.status === "draft" || request.status === "sent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {request.code}
            </h1>
            <StatusBadge status={request.status} />
            <BspBadge dueDate={request.bsp_due_date} variant="full" />
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {request.client_name} · {request.destination}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/agency/requests"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Volver
          </Link>
          {canEditOrDelete && (
            <>
              <Link
                href={`/agency/requests/${request.id}/edit`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Editar
              </Link>
              <DeleteButton requestId={request.id} code={request.code} />
            </>
          )}
          {!isCancelled && !isClosed && <CancelButton requestId={request.id} />}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Box title="Cliente">
          <Detail label="Nombre" value={request.client_name} />
          <Detail label="Email" value={request.client_email ?? "—"} />
          <Detail label="Teléfono" value={request.client_phone ?? "—"} />
        </Box>

        <Box title="Viaje">
          <Detail label="Destino" value={request.destination} />
          <Detail
            label="Fechas"
            value={formatDateRange(
              request.departure_date,
              request.return_date,
              request.flexible_dates,
            )}
          />
          <Detail
            label="Pasajeros"
            value={`${totalPax(
              request.pax_adults,
              request.pax_children,
              request.pax_infants,
            )} (${paxBreakdown(
              request.pax_adults,
              request.pax_children,
              request.pax_infants,
            )})`}
          />
        </Box>

        <Box title="Servicios">
          {request.services.length === 0 ? (
            <p className="text-sm text-zinc-500">No se especificaron.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {request.services.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {SERVICE_LABELS[s]}
                </li>
              ))}
            </ul>
          )}
        </Box>
      </section>

      {request.notes && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {request.notes}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Operadores</h2>
        {dispatches && dispatches.length > 0 ? (
          <ul className="mb-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {dispatches.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>{d.operator.name}</span>
                <span className="text-xs text-zinc-500">
                  Enviado {new Date(d.sent_at).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-zinc-500">
            Esta solicitud todavía no fue enviada a ningún operador.
          </p>
        )}

        {!isCancelled && !isClosed && availableForDispatch.length > 0 && (
          <DispatchPanel
            requestId={request.id}
            operators={availableForDispatch}
          />
        )}
        {!isCancelled &&
          !isClosed &&
          availableForDispatch.length === 0 &&
          linkedOperators.length === 0 && (
            <p className="text-xs text-zinc-500">
              Vinculá operadores en{" "}
              <Link href="/agency/operators" className="underline">
                Operadores
              </Link>{" "}
              para poder enviar.
            </p>
          )}
      </section>

      {quotes && quotes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Cotizaciones recibidas</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {quotes.map((q) => {
              const items = (q.items ?? [])
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((i) => ({
                  id: i.id,
                  description: i.description,
                  amount: Number(i.amount),
                  acceptedAt: i.accepted_at,
                }));
              return (
                <QuoteCard
                  key={q.id}
                  quoteId={q.id}
                  requestId={request.id}
                  operatorName={q.operator.name}
                  status={q.status}
                  totalAmount={Number(q.total_amount)}
                  currency={q.currency}
                  exchangeRate={
                    q.exchange_rate_usd_ars
                      ? Number(q.exchange_rate_usd_ars)
                      : null
                  }
                  validUntil={q.valid_until}
                  paymentTerms={q.payment_terms}
                  notes={q.notes}
                  submittedAt={q.submitted_at}
                  items={items}
                  canActOnRequest={requestActionable}
                />
              );
            })}
          </div>
        </section>
      )}

      {acceptanceReached && (
        <PassengersPanel
          agencyId={tenant.agencyId}
          requestId={request.id}
          passengers={passengers}
          attachmentsByPassenger={attachmentsByPassenger}
          canEdit={!isCancelled && !isClosed}
        />
      )}

      {reservationRow && (
        <ReservationView
          reservation={{
            reservationCode: reservationRow.reservation_code,
            notes: reservationRow.notes,
            operatorName: reservationRow.operator.name,
            createdAt: reservationRow.created_at,
          }}
          attachments={reservationAttachments}
        />
      )}

      {showIssuanceView && (
        <IssuanceView
          attachments={issuanceAttachments}
          issuedAt={request.issued_at}
        />
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Historial de estados</h2>
        <ul className="space-y-2 text-sm">
          {(history ?? []).map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
            >
              <span>
                {h.from_status ? `${STATUS_LABELS[h.from_status]} → ` : ""}
                <strong>{STATUS_LABELS[h.to_status]}</strong>
                {h.notes && <span className="ml-2 text-zinc-500">— {h.notes}</span>}
              </span>
              <span className="text-xs text-zinc-500">
                {new Date(h.changed_at).toLocaleString("es-AR")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
