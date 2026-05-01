import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { formatMoney, type Currency } from "@/lib/requests";
import {
  PAYMENT_STAGE_LABELS,
  emptyTotals,
  formatTotals,
  paymentStage,
  paymentStageBadgeClasses,
  type CurrencyTotals,
} from "@/lib/payments";

export const metadata = { title: "Cobros — Travel Desk" };

export default async function OperatorPaymentsPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, currency, due_date, receipt_uploaded_at, verified_at, created_at, agency:agencies!inner(id, name), request:quote_requests!inner(id, code, client_name, destination, status)",
    )
    .eq("operator_id", tenant.operatorId)
    .order("due_date", { ascending: true, nullsFirst: false });

  const list = payments ?? [];

  const byAgency = new Map<
    string,
    {
      name: string;
      pending: CurrencyTotals;
      pendingVerification: CurrencyTotals;
      verified: CurrencyTotals;
      count: number;
    }
  >();
  for (const p of list) {
    const ag = p.agency;
    const stage = paymentStage(p);
    const entry = byAgency.get(ag.id) ?? {
      name: ag.name,
      pending: emptyTotals(),
      pendingVerification: emptyTotals(),
      verified: emptyTotals(),
      count: 0,
    };
    entry.count += 1;
    const amount = Number(p.amount);
    if (stage === "pending_receipt") entry.pending[p.currency as Currency] += amount;
    else if (stage === "pending_verification")
      entry.pendingVerification[p.currency as Currency] += amount;
    else entry.verified[p.currency as Currency] += amount;
    byAgency.set(ag.id, entry);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cobros a agencias</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Saldos generados por solicitudes emitidas. Verificá los comprobantes que sube cada agencia.
        </p>
      </div>

      {byAgency.size === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Todavía no hay cobros registrados.
        </p>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from(byAgency.entries()).map(([id, entry]) => (
            <div
              key={id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{entry.name}</h2>
                <span className="text-xs text-zinc-500">{entry.count} cobro(s)</span>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Pendiente de pago" value={formatTotals(entry.pending)} tone="warn" />
                <Row
                  label="Para verificar"
                  value={formatTotals(entry.pendingVerification)}
                  tone="info"
                />
                <Row
                  label="Cobrados"
                  value={formatTotals(entry.verified)}
                  tone="ok"
                />
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Detalle</h2>
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">Sin cobros.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((p) => {
              const stage = paymentStage(p);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/operator/requests/${p.request.id}`}
                        className="font-mono font-semibold hover:underline"
                      >
                        {p.request.code}
                      </Link>
                      <span className="text-xs text-zinc-500">
                        {p.request.client_name} · {p.request.destination}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Cobrar a {p.agency.name}
                      {p.due_date
                        ? ` · vence ${new Date(p.due_date).toLocaleDateString("es-AR")}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      {formatMoney(Number(p.amount), p.currency)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${paymentStageBadgeClasses(stage)}`}
                    >
                      {PAYMENT_STAGE_LABELS[stage]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warn" | "info" | "ok";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-800 dark:text-amber-400"
        : "text-blue-700 dark:text-blue-400";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`font-mono ${color}`}>{value}</span>
    </div>
  );
}
