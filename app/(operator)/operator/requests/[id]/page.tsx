import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { BspBadge } from "@/components/bsp-badge";
import {
  QUOTE_STATUS_LABELS,
  SERVICE_LABELS,
  formatDateRange,
  formatMoney,
  paxBreakdown,
  totalPax,
} from "@/lib/requests";
import { fetchMepQuote } from "@/lib/exchange-rate";
import { QuoteForm } from "./quote-form";
import { WithdrawButton } from "./withdraw-button";
import {
  PassengersView,
  type AttachmentView,
  type PassengerView,
} from "./passengers-view";
import { ReservationPanel } from "./reservation-panel";
import type { OperatorAttachment } from "./operator-attachments-block";
import { IssuancePanel } from "./issuance-panel";
import type { AttachmentKind } from "@/lib/passengers";
import { PaymentVerifyPanel, type ReceiptView } from "./payment-verify-panel";

export const metadata = { title: "Solicitud — Travel Desk" };

type Params = { id: string };

export default async function OperatorRequestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();

  const { data: dispatch } = await supabase
    .from("quote_request_dispatches")
    .select(
      "sent_at, request:quote_requests!inner(*, agency:agencies!inner(id, name))",
    )
    .eq("operator_id", tenant.operatorId)
    .eq("quote_request_id", id)
    .maybeSingle();

  if (!dispatch) notFound();
  const request = dispatch.request;

  const [
    { data: quotes },
    mep,
    { data: passengersRaw },
    { data: attachmentsRaw },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "*, items:quote_items(id, sort_order, description, amount, accepted_at)",
      )
      .eq("quote_request_id", id)
      .eq("operator_id", tenant.operatorId)
      .order("submitted_at", { ascending: false }),
    fetchMepQuote(),
    supabase
      .from("passengers")
      .select(
        "id, full_name, passenger_type, document_type, document_number, birth_date",
      )
      .eq("quote_request_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("attachments")
      .select(
        "id, file_name, storage_path, size_bytes, passenger_id, kind, created_at",
      )
      .eq("quote_request_id", id)
      .in("kind", [
        "passenger_doc",
        "reservation",
        "voucher",
        "invoice",
        "file_doc",
        "payment_receipt",
      ])
      .order("created_at", { ascending: false }),
  ]);

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, reservation_code, notes, created_at, operator_id")
    .eq("quote_request_id", id)
    .eq("operator_id", tenant.operatorId)
    .maybeSingle();

  const paymentRelevant =
    request.status === "issued" ||
    request.status === "payment_pending" ||
    request.status === "closed";

  const { data: paymentRow } = paymentRelevant
    ? await supabase
        .from("payments")
        .select(
          "id, amount, currency, due_date, receipt_uploaded_at, verified_at, notes",
        )
        .eq("quote_request_id", id)
        .eq("operator_id", tenant.operatorId)
        .maybeSingle()
    : { data: null };

  const myAcceptedQuote = (quotes ?? []).find(
    (q) => q.status === "accepted",
  );
  const canManageReservation = !!myAcceptedQuote;

  const reservationAttachments: OperatorAttachment[] = [];
  const issuanceAttachments: Partial<Record<AttachmentKind, OperatorAttachment[]>> = {};
  const paymentReceipts: ReceiptView[] = [];
  for (const a of attachmentsRaw ?? []) {
    const row: OperatorAttachment = {
      id: a.id,
      fileName: a.file_name,
      storagePath: a.storage_path,
      sizeBytes: a.size_bytes,
      createdAt: a.created_at,
    };
    if (a.kind === "reservation") {
      reservationAttachments.push(row);
    } else if (
      a.kind === "voucher" ||
      a.kind === "invoice" ||
      a.kind === "file_doc"
    ) {
      (issuanceAttachments[a.kind] ??= []).push(row);
    } else if (a.kind === "payment_receipt") {
      paymentReceipts.push({
        id: a.id,
        fileName: a.file_name,
        storagePath: a.storage_path,
        sizeBytes: a.size_bytes,
      });
    }
  }

  const showIssuance =
    canManageReservation &&
    !!reservation &&
    request.status !== "cancelled" &&
    request.status !== "closed";
  const alreadyIssued =
    request.status === "issued" ||
    request.status === "payment_pending" ||
    request.status === "closed";

  const passengers: PassengerView[] = (passengersRaw ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    passengerType: p.passenger_type,
    documentType: p.document_type,
    documentNumber: p.document_number,
    birthDate: p.birth_date,
  }));

  const passengerAttachments: Record<string, AttachmentView[]> = {};
  for (const a of attachmentsRaw ?? []) {
    if (!a.passenger_id) continue;
    (passengerAttachments[a.passenger_id] ??= []).push({
      id: a.id,
      fileName: a.file_name,
      storagePath: a.storage_path,
      sizeBytes: a.size_bytes,
    });
  }

  const showPassengers =
    request.status === "accepted" ||
    request.status === "partially_accepted" ||
    request.status === "reserved" ||
    request.status === "docs_uploaded" ||
    request.status === "issued" ||
    request.status === "payment_pending" ||
    request.status === "closed";

  // Quote vigente (la última con estado relevante) → submitted | accepted | rejected
  const activeQuote =
    (quotes ?? []).find(
      (q) => q.status === "submitted" || q.status === "accepted",
    ) ?? null;
  const rejectedQuote = !activeQuote
    ? ((quotes ?? []).find((q) => q.status === "rejected") ?? null)
    : null;
  const visibleQuote = activeQuote ?? rejectedQuote;
  const historicQuotes = (quotes ?? []).filter(
    (q) => q.id !== visibleQuote?.id,
  );

  const requestOpen =
    request.status !== "cancelled" &&
    request.status !== "closed" &&
    request.status !== "accepted" &&
    request.status !== "partially_accepted" &&
    request.status !== "reserved" &&
    request.status !== "issued" &&
    request.status !== "docs_uploaded" &&
    request.status !== "payment_pending";

  // El operador puede mandar nueva cotización solo si no hay una accepted/rejected
  // ya cerrada para él, y la request sigue abierta.
  const canQuote =
    requestOpen &&
    !(activeQuote && activeQuote.status === "accepted") &&
    !rejectedQuote;

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
            De {request.agency.name} · recibida{" "}
            {new Date(dispatch.sent_at).toLocaleString("es-AR")}
          </p>
        </div>
        <Link
          href="/operator/requests"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      <section className={`grid gap-4 ${showPassengers ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {showPassengers && (
          <Box title="Cliente">
            <Detail label="Nombre" value={request.client_name} />
            <Detail label="Email" value={request.client_email ?? "—"} />
            <Detail label="Teléfono" value={request.client_phone ?? "—"} />
          </Box>
        )}

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
          <h2 className="mb-2 text-sm font-semibold">Notas de la agencia</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {request.notes}
          </p>
        </section>
      )}

      {visibleQuote && (
        <section
          className={
            visibleQuote.status === "accepted"
              ? "rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              : visibleQuote.status === "rejected"
                ? "rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20"
                : "rounded-2xl border border-blue-200 bg-blue-50/30 p-5 dark:border-blue-900/40 dark:bg-blue-950/10"
          }
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                {visibleQuote.status === "accepted"
                  ? "Tu cotización fue aceptada"
                  : visibleQuote.status === "rejected"
                    ? "Tu cotización fue rechazada"
                    : "Tu cotización activa"}
              </h2>
              {visibleQuote.status === "accepted" && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {(() => {
                    const total = (visibleQuote.items ?? []).length;
                    const accepted = (visibleQuote.items ?? []).filter(
                      (i) => i.accepted_at,
                    ).length;
                    if (total === 0) return "Aceptación total.";
                    if (accepted === total) return "Aceptación total.";
                    return `Aceptación parcial: ${accepted} de ${total} ítem(s).`;
                  })()}
                </p>
              )}
            </div>
            {visibleQuote.status === "submitted" && (
              <WithdrawButton quoteId={visibleQuote.id} requestId={request.id} />
            )}
          </div>
          <QuoteSummary
            totalAmount={Number(visibleQuote.total_amount)}
            currency={visibleQuote.currency}
            exchangeRate={
              visibleQuote.exchange_rate_usd_ars
                ? Number(visibleQuote.exchange_rate_usd_ars)
                : null
            }
            validUntil={visibleQuote.valid_until}
            paymentTerms={visibleQuote.payment_terms}
            notes={visibleQuote.notes}
            items={(visibleQuote.items ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => ({
                description: i.description,
                amount: Number(i.amount),
                acceptedAt: i.accepted_at,
              }))}
            submittedAt={visibleQuote.submitted_at}
            quoteStatus={visibleQuote.status}
          />
        </section>
      )}

      {canQuote && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold">
            {activeQuote && activeQuote.status === "submitted"
              ? "Reemplazar con una nueva cotización"
              : "Enviar cotización"}
          </h2>
          <QuoteForm
            requestId={request.id}
            mepSell={mep?.sell ?? null}
            initial={
              activeQuote && activeQuote.status === "submitted"
                ? {
                    totalAmount: Number(activeQuote.total_amount),
                    currency: activeQuote.currency,
                    paymentTerms: activeQuote.payment_terms,
                    validUntil: activeQuote.valid_until,
                    notes: activeQuote.notes,
                    exchangeRate: activeQuote.exchange_rate_usd_ars
                      ? Number(activeQuote.exchange_rate_usd_ars)
                      : null,
                    items: (activeQuote.items ?? [])
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((i) => ({
                        description: i.description,
                        amount: Number(i.amount),
                      })),
                  }
                : undefined
            }
          />
        </section>
      )}

      {showPassengers && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Pasajeros y documentos</h2>
          <PassengersView
            passengers={passengers}
            attachmentsByPassenger={passengerAttachments}
          />
        </section>
      )}

      {canManageReservation && (
        <ReservationPanel
          agencyId={request.agency.id}
          requestId={request.id}
          operatorId={tenant.operatorId}
          initial={
            reservation
              ? {
                  reservationCode: reservation.reservation_code,
                  notes: reservation.notes,
                  createdAt: reservation.created_at,
                }
              : null
          }
          attachments={reservationAttachments}
        />
      )}

      {showIssuance && (
        <IssuancePanel
          agencyId={request.agency.id}
          requestId={request.id}
          operatorId={tenant.operatorId}
          attachmentsByKind={issuanceAttachments}
          alreadyIssued={alreadyIssued}
          issuedAt={request.issued_at}
        />
      )}

      {paymentRow && (
        <PaymentVerifyPanel
          requestId={request.id}
          payment={{
            id: paymentRow.id,
            amount: Number(paymentRow.amount),
            currency: paymentRow.currency,
            dueDate: paymentRow.due_date,
            receiptUploadedAt: paymentRow.receipt_uploaded_at,
            verifiedAt: paymentRow.verified_at,
            verifiedNotes: paymentRow.notes,
            agencyName: request.agency.name,
          }}
          receipts={paymentReceipts}
        />
      )}

      {historicQuotes.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Historial de cotizaciones</h2>
          <ul className="space-y-3">
            {historicQuotes.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatMoney(Number(q.total_amount), q.currency)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {QUOTE_STATUS_LABELS[q.status]} ·{" "}
                    {new Date(q.submitted_at).toLocaleString("es-AR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
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

function QuoteSummary({
  totalAmount,
  currency,
  exchangeRate,
  validUntil,
  paymentTerms,
  notes,
  items,
  submittedAt,
  quoteStatus,
}: {
  totalAmount: number;
  currency: "USD" | "ARS";
  exchangeRate: number | null;
  validUntil: string | null;
  paymentTerms: string | null;
  notes: string | null;
  items: { description: string; amount: number; acceptedAt: string | null }[];
  submittedAt: string;
  quoteStatus: "submitted" | "accepted" | "rejected" | "withdrawn" | "superseded";
}) {
  const expired = validUntil && new Date(validUntil) < new Date();
  const isAccepted = quoteStatus === "accepted";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold tracking-tight">
          {formatMoney(totalAmount, currency)}
        </span>
        {exchangeRate && (
          <span className="text-xs text-zinc-500">
            TC USD→ARS: {exchangeRate.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
          </span>
        )}
        <span className="text-xs text-zinc-500">
          Enviada {new Date(submittedAt).toLocaleString("es-AR")}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail
          label="Validez"
          value={
            validUntil
              ? `${new Date(validUntil).toLocaleDateString("es-AR")}${expired ? " (vencida)" : ""}`
              : "—"
          }
        />
        <Detail label="Pago" value={paymentTerms ?? "—"} />
      </div>
      {items.length > 0 && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
            Ítems
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((i, idx) => (
              <li key={idx} className="flex justify-between py-1.5 text-sm">
                <span
                  className={
                    i.acceptedAt
                      ? "font-medium text-emerald-700 dark:text-emerald-400"
                      : isAccepted
                        ? "text-zinc-500 line-through"
                        : ""
                  }
                >
                  {i.description}
                  {i.acceptedAt && (
                    <span className="ml-1 text-xs">✓ aceptado</span>
                  )}
                </span>
                <span className="font-mono">
                  {formatMoney(i.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {notes && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Notas</div>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{notes}</p>
        </div>
      )}
    </div>
  );
}
