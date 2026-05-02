import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { formatMoney, type Currency } from "@/lib/requests";
import {
  PAYMENT_STAGE_LABELS,
  emptyTotals,
  formatTotals,
  paymentStageBadgeClasses,
  type CurrencyTotals,
  type PaymentStage,
} from "@/lib/payments";
import { SearchFilters } from "@/components/search-filters";

export const metadata = { title: "Cobros — Travel Desk" };

const STAGE_OPTIONS = [
  { value: "pending_receipt", label: PAYMENT_STAGE_LABELS.pending_receipt },
  { value: "pending_verification", label: PAYMENT_STAGE_LABELS.pending_verification },
  { value: "verified", label: PAYMENT_STAGE_LABELS.verified },
];

export default async function OperatorPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; from?: string; to?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const stage = params.stage?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("search_operator_payments", {
    p_operator_id: tenant.operatorId,
    p_query: q || undefined,
    p_stage: stage || undefined,
    p_due_from: from || undefined,
    p_due_to: to || undefined,
  });

  const list = rows ?? [];
  const filtered = q.length > 0 || stage.length > 0 || from.length > 0 || to.length > 0;

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const totalsByStage: Record<PaymentStage, CurrencyTotals> = {
    pending_receipt: emptyTotals(),
    pending_verification: emptyTotals(),
    verified: emptyTotals(),
  };
  let overdueCount = 0;
  let due7Count = 0;
  for (const r of list) {
    const stageRow: PaymentStage = r.verified_at
      ? "verified"
      : r.receipt_uploaded_at
        ? "pending_verification"
        : "pending_receipt";
    totalsByStage[stageRow][r.currency as Currency] += Number(r.amount);
    if (r.due_date && stageRow !== "verified") {
      const due = new Date(`${r.due_date}T00:00:00`);
      const diff = (due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < 0) overdueCount += 1;
      else if (diff <= 7) due7Count += 1;
    }
  }

  const upcoming = list
    .filter(
      (r) =>
        !r.verified_at &&
        r.due_date &&
        new Date(`${r.due_date}T00:00:00`).getTime() >= todayDate.getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Operador</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">Cobros</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Saldos generados por solicitudes emitidas. Verificá los comprobantes
          que sube cada agencia.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Pendiente de cobro"
          value={formatTotals(totalsByStage.pending_receipt)}
          tone="warn"
        />
        <Kpi
          label="Para verificar"
          value={formatTotals(totalsByStage.pending_verification)}
          tone="info"
        />
        <Kpi
          label="Cobrados"
          value={formatTotals(totalsByStage.verified)}
          tone="ok"
        />
        <Kpi
          label="Vencidos / próximos 7d"
          value={`${overdueCount} · ${due7Count}`}
          tone={overdueCount > 0 ? "danger" : "neutral"}
          hint={overdueCount > 0 ? "Cobros atrasados" : "Sin atrasados"}
        />
      </section>

      {upcoming.length > 0 && (
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">Próximos vencimientos</h2>
            <span className="text-[11px] text-zinc-500">5 más cercanos</span>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {upcoming.map((r) => (
              <li key={r.payment_id}>
                <Link
                  href={`/operator/requests/${r.request_id}`}
                  className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-zinc-100">
                      {r.request_code}
                    </span>
                    <span className="text-zinc-400">
                      {r.client_name} · {r.agency_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-zinc-200">
                      {formatMoney(Number(r.amount), r.currency)}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {new Date(`${r.due_date}T00:00:00`).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SearchFilters
        fields={[
          {
            kind: "text",
            name: "q",
            placeholder: "Buscar por código, cliente o agencia…",
          },
          { kind: "select", name: "stage", options: STAGE_OPTIONS, placeholder: "Todos los estados" },
          { kind: "date", name: "from", placeholder: "Vence desde" },
          { kind: "date", name: "to", placeholder: "Vence hasta" },
        ]}
      />

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Detalle</h2>
          <span className="text-[11px] text-zinc-500">
            {list.length} {list.length === 1 ? "cobro" : "cobros"}
          </span>
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            {filtered
              ? "No hay cobros que matcheen los filtros."
              : "Todavía no hay cobros registrados."}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {list.map((r) => {
              const st: PaymentStage = r.verified_at
                ? "verified"
                : r.receipt_uploaded_at
                  ? "pending_verification"
                  : "pending_receipt";
              return (
                <li
                  key={r.payment_id}
                  className="flex flex-col gap-2 px-5 py-3 text-sm transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/operator/requests/${r.request_id}`}
                        className="font-mono font-semibold text-zinc-100 hover:text-[color:var(--accent-strong)] hover:underline underline-offset-4"
                      >
                        {r.request_code}
                      </Link>
                      <span className="text-xs text-zinc-400">{r.client_name}</span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Cobrar a {r.agency_name}
                      {r.due_date
                        ? ` · vence ${new Date(`${r.due_date}T00:00:00`).toLocaleDateString("es-AR")}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-zinc-100">
                      {formatMoney(Number(r.amount), r.currency)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${paymentStageBadgeClasses(st)}`}
                    >
                      {PAYMENT_STAGE_LABELS[st]}
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

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "ok" | "info" | "danger" | "neutral";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "info"
          ? "text-indigo-300"
          : tone === "danger"
            ? "text-rose-300"
            : "text-zinc-100";
  const glow =
    tone === "ok"
      ? "before:bg-emerald-500/10"
      : tone === "warn"
        ? "before:bg-amber-500/10"
        : tone === "info"
          ? "before:bg-indigo-500/10"
          : tone === "danger"
            ? "before:bg-rose-500/10"
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
