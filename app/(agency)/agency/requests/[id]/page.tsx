import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import {
  QUOTE_STATUS_LABELS,
  SERVICE_LABELS,
  STATUS_LABELS,
  formatDateRange,
  formatMoney,
  paxBreakdown,
  totalPax,
} from "@/lib/requests";
import { DispatchPanel } from "./dispatch-panel";
import { CancelButton } from "./cancel-button";

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
        "*, operator:operators!inner(id, name), items:quote_items(id, sort_order, description, amount)",
      )
      .eq("quote_request_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  const dispatchedIds = new Set((dispatches ?? []).map((d) => d.operator.id));
  const linkedOperators = (links ?? []).map((l) => l.operator);
  const availableForDispatch = linkedOperators.filter((op) => !dispatchedIds.has(op.id));

  const isCancelled = request.status === "cancelled";
  const isClosed = request.status === "closed";

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
            {request.client_name} · {request.destination}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/agency/requests"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Volver
          </Link>
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
                .sort((a, b) => a.sort_order - b.sort_order);
              const expired =
                q.valid_until && new Date(q.valid_until) < new Date();
              const isActive = q.status === "submitted";
              return (
                <article
                  key={q.id}
                  className={
                    (isActive
                      ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10 "
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ") +
                    "rounded-2xl border p-5"
                  }
                >
                  <header className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{q.operator.name}</div>
                      <div className="text-xs text-zinc-500">
                        {QUOTE_STATUS_LABELS[q.status]} ·{" "}
                        {new Date(q.submitted_at).toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold tracking-tight">
                        {formatMoney(Number(q.total_amount), q.currency)}
                      </div>
                      {q.exchange_rate_usd_ars && (
                        <div className="text-xs text-zinc-500">
                          TC{" "}
                          {Number(q.exchange_rate_usd_ars).toLocaleString("es-AR", {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>
                  </header>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-500">
                        Validez
                      </div>
                      <div>
                        {q.valid_until
                          ? `${new Date(q.valid_until).toLocaleDateString("es-AR")}${expired ? " (vencida)" : ""}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-500">
                        Pago
                      </div>
                      <div>{q.payment_terms ?? "—"}</div>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
                        Ítems
                      </div>
                      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {items.map((i) => (
                          <li
                            key={i.id}
                            className="flex justify-between py-1.5 text-sm"
                          >
                            <span>{i.description}</span>
                            <span className="font-mono">
                              {formatMoney(Number(i.amount), q.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {q.notes && (
                    <div className="mt-3">
                      <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
                        Notas
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                        {q.notes}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            La aceptación (total o parcial por ítem) se habilita en la próxima
            iteración.
          </p>
        </section>
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
