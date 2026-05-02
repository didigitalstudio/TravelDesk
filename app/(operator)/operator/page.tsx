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

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: dispatches },
    { data: openDispatches },
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
      .limit(6),
    supabase
      .from("quote_request_dispatches")
      .select("request:quote_requests!inner(status)")
      .eq("operator_id", tenant.operatorId)
      .in("request.status", ["sent", "quoted"]),
    supabase
      .from("quotes")
      .select("status, total_amount, currency, submitted_at")
      .eq("operator_id", tenant.operatorId)
      .gte("submitted_at", sixMonthsAgo),
    supabase
      .from("payments")
      .select("amount, currency, receipt_uploaded_at, verified_at")
      .eq("operator_id", tenant.operatorId),
  ]);

  const dispatchList = dispatches ?? [];
  const quoteList = quotes ?? [];
  const openCount = openDispatches?.length ?? 0;

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


  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Operador</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          {tenant.operatorName}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Resumen de tus cotizaciones y cobros.
        </p>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/operator/settings/agencies"
          className="surface block border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm transition-colors hover:bg-amber-500/[0.1]"
        >
          <strong className="text-amber-200">
            Tenés {pendingCount} invitación{pendingCount === 1 ? "" : "es"} pendiente
            {pendingCount === 1 ? "" : "s"}.
          </strong>{" "}
          <span className="text-zinc-400">Revisalas y aceptá las que quieras.</span>
        </Link>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Para cotizar" value={String(openCount)} tone="accent" />
        <Stat label="Cotizaciones activas" value={String(submittedCount)} />
        <Stat
          label="Tasa de aceptación"
          value={totalQuoted > 0 ? `${conversionRate}%` : "—"}
          hint={`${acceptedCount} de ${totalQuoted}`}
          tone="ok"
        />
        <Stat label="Por cobrar" value={formatTotals(pendingTotals)} tone="warn" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">
            Cotizaciones por estado
          </h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(quoteCounts).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span className="text-zinc-400">
                  {QUOTE_STATUS_LABELS[status as QuoteStatus]}
                </span>
                <span className="font-mono text-zinc-200">{count}</span>
              </li>
            ))}
            {Object.keys(quoteCounts).length === 0 && (
              <p className="text-xs text-zinc-500">Sin cotizaciones todavía.</p>
            )}
          </ul>
        </div>
        <div className="surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Cobros verificados</h2>
          <p className="font-mono text-xl text-emerald-300">{formatTotals(verifiedTotals)}</p>
          <Link href="/operator/payments" className="accent-link mt-3 inline-block text-xs">
            Ver detalle →
          </Link>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Últimas solicitudes recibidas
          </h2>
          <Link href="/operator/requests" className="accent-link text-xs">
            Ver todas →
          </Link>
        </div>
        {dispatchList.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            No te llegaron solicitudes todavía.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {dispatchList.map((d) => (
              <li key={d.request.id}>
                <Link
                  href={`/operator/requests/${d.request.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-zinc-100">
                      {d.request.code}
                    </span>
                    <StatusBadge status={d.request.status} />
                    <span className="text-zinc-400">
                      {d.request.agency.name} · {d.request.destination}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
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
  tone?: "warn" | "ok" | "accent";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "accent"
          ? "text-[color:var(--accent-strong)]"
          : "text-zinc-100";
  const glow =
    tone === "ok"
      ? "before:bg-emerald-500/10"
      : tone === "warn"
        ? "before:bg-amber-500/10"
        : tone === "accent"
          ? "before:bg-indigo-500/10"
          : "before:bg-white/[0.02]";
  return (
    <div
      className={`surface relative overflow-hidden p-4 before:pointer-events-none before:absolute before:right-[-30%] before:top-[-30%] before:h-32 before:w-32 before:rounded-full before:blur-3xl ${glow}`}
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-500">{hint}</div>}
    </div>
  );
}
