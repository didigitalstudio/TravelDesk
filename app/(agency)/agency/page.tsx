import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { BspBadge } from "@/components/bsp-badge";
import { STATUS_LABELS, formatMoney, type Currency, type RequestStatus } from "@/lib/requests";
import {
  emptyTotals,
  formatTotals,
  paymentStage,
  type CurrencyTotals,
} from "@/lib/payments";

export const metadata = { title: "Portal Agencia — Travel Desk" };

const ACTIVE_STATUSES: RequestStatus[] = [
  "draft",
  "sent",
  "quoted",
  "partially_accepted",
  "accepted",
  "reserved",
  "docs_uploaded",
  "issued",
  "payment_pending",
];

export default async function AgencyHome() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();

  // Stats agregados sobre todo el universo (status + created_at, payload mínimo).
  // Recientes para mostrar van en query separada con campos completos.
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: statsRows },
    { data: recentRequests },
    { data: payments },
    { count: clientsCount },
    { data: bspUpcoming },
  ] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("status, created_at")
      .eq("agency_id", tenant.agencyId),
    supabase
      .from("quote_requests")
      .select("id, code, status, client_name, destination, created_at")
      .eq("agency_id", tenant.agencyId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select("amount, currency, receipt_uploaded_at, verified_at")
      .eq("agency_id", tenant.agencyId),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", tenant.agencyId),
    supabase
      .from("quote_requests")
      .select("id, code, client_name, bsp_due_date, status")
      .eq("agency_id", tenant.agencyId)
      .not("bsp_due_date", "is", null)
      .in("status", ["issued", "payment_pending"])
      .order("bsp_due_date", { ascending: true })
      .limit(8),
  ]);

  const allStats = statsRows ?? [];
  const recent = recentRequests ?? [];
  const sinceCutoff = allStats.filter((r) => r.created_at >= sixMonthsAgo);

  const statusCounts = countByStatus(allStats);
  const activeCount = ACTIVE_STATUSES.reduce((acc, s) => acc + (statusCounts[s] ?? 0), 0);
  const totalCount = allStats.length;

  const pendingTotals = emptyTotals();
  const verifiedTotals = emptyTotals();
  for (const p of payments ?? []) {
    const stage = paymentStage(p);
    const amount = Number(p.amount);
    if (stage === "verified") verifiedTotals[p.currency as Currency] += amount;
    else pendingTotals[p.currency as Currency] += amount;
  }

  // Solicitudes por mes (últimos 6 meses)
  const monthly = monthlyCounts(sinceCutoff);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Agencia</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          {tenant.agencyName}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Resumen de la actividad de tu agencia.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Solicitudes activas"
          value={String(activeCount)}
          hint={`Total: ${totalCount}`}
          tone="accent"
        />
        <Stat label="A pagar a operadores" value={formatTotals(pendingTotals)} tone="warn" />
        <Stat label="Pagos verificados" value={formatTotals(verifiedTotals)} tone="ok" />
        <Stat label="Clientes" value={String(clientsCount ?? 0)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">
            Solicitudes últimos 6 meses
          </h2>
          <BarChart data={monthly} />
        </div>

        <div className="surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Por estado</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <li key={status} className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    {STATUS_LABELS[status as RequestStatus]}
                  </span>
                  <span className="font-mono text-zinc-200">{count}</span>
                </li>
              ))}
          </ul>
        </div>
      </section>

      {bspUpcoming && bspUpcoming.length > 0 && (
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">Próximos vencimientos BSP</h2>
            <Link href="/agency/payments" className="accent-link text-xs">
              Ver pagos →
            </Link>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {bspUpcoming.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/agency/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-zinc-100">{r.code}</span>
                    <span className="text-zinc-400">{r.client_name}</span>
                  </div>
                  <BspBadge dueDate={r.bsp_due_date} variant="full" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Últimas solicitudes</h2>
          <Link href="/agency/requests" className="accent-link text-xs">
            Ver todas →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">Sin solicitudes todavía.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/agency/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-zinc-100">{r.code}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-zinc-400">
                      {r.client_name} · {r.destination}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString("es-AR")}
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

function countByStatus(requests: { status: RequestStatus }[]): Partial<Record<RequestStatus, number>> {
  const acc: Partial<Record<RequestStatus, number>> = {};
  for (const r of requests) {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
  }
  return acc;
}

function monthlyCounts(requests: { created_at: string }[]): { label: string; count: number }[] {
  const buckets: { label: string; count: number; key: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-AR", { month: "short" });
    buckets.push({ key, label, count: 0 });
  }
  for (const r of requests) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets.map((b) => ({ label: b.label, count: b.count }));
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 text-center text-xs text-zinc-500">
        Cuando empieces a cargar solicitudes vas a ver acá la tendencia mensual.
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="text-[10px] font-mono text-zinc-400">{d.count}</div>
          <div
            className="w-full rounded-md bg-gradient-to-t from-indigo-500/40 via-indigo-400/70 to-indigo-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 4 : 0,
            }}
          />
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}
