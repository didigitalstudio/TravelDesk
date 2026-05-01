import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import {
  QUOTE_STATUS_LABELS,
  formatMoney,
  type Currency,
  type QuoteStatus,
} from "@/lib/requests";
import {
  emptyTotals,
  formatTotals,
  paymentStage,
} from "@/lib/payments";

export const metadata = { title: "Portal Operador — Travel Desk" };

export default async function OperatorHome() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: pending } = user?.email
    ? await supabase.rpc("pending_invitations_for_email", { p_email: user.email })
    : { data: null };
  const pendingCount = pending?.length ?? 0;

  const [
    { data: dispatches },
    { data: quotes },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("quote_request_dispatches")
      .select(
        "sent_at, request:quote_requests!inner(id, code, status, client_name, destination, agency:agencies!inner(name))",
      )
      .eq("operator_id", tenant.operatorId)
      .order("sent_at", { ascending: false })
      .limit(50),
    supabase
      .from("quotes")
      .select("status, total_amount, currency, submitted_at")
      .eq("operator_id", tenant.operatorId),
    supabase
      .from("payments")
      .select("amount, currency, receipt_uploaded_at, verified_at")
      .eq("operator_id", tenant.operatorId),
  ]);

  const dispatchList = dispatches ?? [];
  const quoteList = quotes ?? [];

  const quoteCounts: Partial<Record<QuoteStatus, number>> = {};
  for (const q of quoteList) {
    quoteCounts[q.status] = (quoteCounts[q.status] ?? 0) + 1;
  }
  const acceptedCount = quoteCounts["accepted"] ?? 0;
  const submittedCount = quoteCounts["submitted"] ?? 0;
  const totalQuoted = quoteList.length;
  const conversionRate = totalQuoted ? Math.round((acceptedCount / totalQuoted) * 100) : 0;

  const pendingTotals = emptyTotals();
  const verifiedTotals = emptyTotals();
  for (const p of payments ?? []) {
    const stage = paymentStage(p);
    const amount = Number(p.amount);
    if (stage === "verified") verifiedTotals[p.currency as Currency] += amount;
    else pendingTotals[p.currency as Currency] += amount;
  }

  const openToQuote = dispatchList.filter(
    (d) => d.request.status === "sent" || d.request.status === "quoted",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.operatorName}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Resumen de tus cotizaciones y cobros.
        </p>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/operator/agencies"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
        >
          <strong>
            Tenés {pendingCount} invitación{pendingCount === 1 ? "" : "es"} pendiente
            {pendingCount === 1 ? "" : "s"}.
          </strong>{" "}
          <span className="text-zinc-600 dark:text-zinc-400">Revisalas y aceptá las que quieras.</span>
        </Link>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Para cotizar" value={String(openToQuote.length)} />
        <Stat label="Cotizaciones activas" value={String(submittedCount)} />
        <Stat
          label="Tasa de aceptación"
          value={totalQuoted > 0 ? `${conversionRate}%` : "—"}
          hint={`${acceptedCount} de ${totalQuoted}`}
        />
        <Stat label="Por cobrar" value={formatTotals(pendingTotals)} tone="warn" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Cotizaciones por estado</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(quoteCounts).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {QUOTE_STATUS_LABELS[status as QuoteStatus]}
                </span>
                <span className="font-mono">{count}</span>
              </li>
            ))}
            {Object.keys(quoteCounts).length === 0 && (
              <p className="text-xs text-zinc-500">Sin cotizaciones todavía.</p>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Cobros verificados</h2>
          <p className="font-mono text-lg">{formatTotals(verifiedTotals)}</p>
          <Link
            href="/operator/payments"
            className="mt-3 inline-block text-xs text-zinc-500 hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Últimas solicitudes recibidas</h2>
          <Link href="/operator/requests" className="text-xs text-zinc-500 hover:underline">
            Ver todas →
          </Link>
        </div>
        {dispatchList.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            No te llegaron solicitudes todavía.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {dispatchList.slice(0, 6).map((d) => (
              <li key={d.request.id}>
                <Link
                  href={`/operator/requests/${d.request.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">{d.request.code}</span>
                    <StatusBadge status={d.request.status} />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {d.request.agency.name} · {d.request.client_name}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(d.sent_at).toLocaleDateString("es-AR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "ok";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-800 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-400">{hint}</div>}
    </div>
  );
}
