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

  const [
    { data: requests },
    { data: payments },
    { count: clientsCount },
    { data: bspUpcoming },
  ] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id, code, status, client_name, destination, created_at, bsp_due_date")
      .eq("agency_id", tenant.agencyId)
      .order("created_at", { ascending: false })
      .limit(50),
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

  const reqList = requests ?? [];
  const allRequests = reqList; // últimos 50 alcanza para conteos

  const statusCounts = countByStatus(allRequests);
  const activeCount = ACTIVE_STATUSES.reduce((acc, s) => acc + (statusCounts[s] ?? 0), 0);

  const pendingTotals = emptyTotals();
  const verifiedTotals = emptyTotals();
  for (const p of payments ?? []) {
    const stage = paymentStage(p);
    const amount = Number(p.amount);
    if (stage === "verified") verifiedTotals[p.currency as Currency] += amount;
    else pendingTotals[p.currency as Currency] += amount;
  }

  // Solicitudes por mes (últimos 6 meses)
  const monthly = monthlyCounts(allRequests);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.agencyName}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Resumen de la actividad de tu agencia.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Solicitudes activas" value={String(activeCount)} hint={`Total visto: ${reqList.length}+`} />
        <Stat label="A pagar a operadores" value={formatTotals(pendingTotals)} tone="warn" />
        <Stat label="Pagos verificados" value={formatTotals(verifiedTotals)} tone="ok" />
        <Stat label="Clientes" value={String(clientsCount ?? 0)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Solicitudes últimos 6 meses</h2>
          <BarChart data={monthly} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Por estado</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {STATUS_LABELS[status as RequestStatus]}
                  </span>
                  <span className="font-mono">{count}</span>
                </li>
              ))}
          </ul>
        </div>
      </section>

      {bspUpcoming && bspUpcoming.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Próximos vencimientos BSP</h2>
            <Link href="/agency/payments" className="text-xs text-zinc-500 hover:underline">
              Ver pagos →
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {bspUpcoming.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/agency/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">{r.code}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {r.client_name}
                    </span>
                  </div>
                  <BspBadge dueDate={r.bsp_due_date} variant="full" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Últimas solicitudes</h2>
          <Link href="/agency/requests" className="text-xs text-zinc-500 hover:underline">
            Ver todas →
          </Link>
        </div>
        {reqList.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">Sin solicitudes todavía.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {reqList.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/agency/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">{r.code}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {r.client_name} · {r.destination}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
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
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="text-[10px] text-zinc-500">{d.count}</div>
          <div
            className="w-full rounded-t bg-blue-500/70"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
          />
          <div className="text-[10px] uppercase text-zinc-500">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
