import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
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

  const [{ data: quotes }, mep] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, items:quote_items(id, sort_order, description, amount)")
      .eq("quote_request_id", id)
      .eq("operator_id", tenant.operatorId)
      .order("submitted_at", { ascending: false }),
    fetchMepQuote(),
  ]);

  const activeQuote = (quotes ?? []).find((q) => q.status === "submitted") ?? null;
  const historicQuotes = (quotes ?? []).filter((q) => q.id !== activeQuote?.id);

  const canQuote =
    request.status !== "cancelled" &&
    request.status !== "closed" &&
    request.status !== "accepted" &&
    request.status !== "reserved" &&
    request.status !== "issued" &&
    request.status !== "docs_uploaded" &&
    request.status !== "payment_pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {request.code}
            </h1>
            <StatusBadge status={request.status} />
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
          <h2 className="mb-2 text-sm font-semibold">Notas de la agencia</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {request.notes}
          </p>
        </section>
      )}

      {activeQuote && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tu cotización activa</h2>
            <WithdrawButton quoteId={activeQuote.id} requestId={request.id} />
          </div>
          <QuoteSummary
            totalAmount={Number(activeQuote.total_amount)}
            currency={activeQuote.currency}
            exchangeRate={
              activeQuote.exchange_rate_usd_ars
                ? Number(activeQuote.exchange_rate_usd_ars)
                : null
            }
            validUntil={activeQuote.valid_until}
            paymentTerms={activeQuote.payment_terms}
            notes={activeQuote.notes}
            items={(activeQuote.items ?? []).map((i) => ({
              description: i.description,
              amount: Number(i.amount),
            }))}
            submittedAt={activeQuote.submitted_at}
          />
        </section>
      )}

      {canQuote && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold">
            {activeQuote ? "Reemplazar con una nueva cotización" : "Enviar cotización"}
          </h2>
          <QuoteForm
            requestId={request.id}
            mepSell={mep?.sell ?? null}
            initial={
              activeQuote
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
}: {
  totalAmount: number;
  currency: "USD" | "ARS";
  exchangeRate: number | null;
  validUntil: string | null;
  paymentTerms: string | null;
  notes: string | null;
  items: { description: string; amount: number }[];
  submittedAt: string;
}) {
  const expired = validUntil && new Date(validUntil) < new Date();
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
                <span>{i.description}</span>
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
