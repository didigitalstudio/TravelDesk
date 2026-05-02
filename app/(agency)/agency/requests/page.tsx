import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { BspBadge } from "@/components/bsp-badge";
import { SearchFilters } from "@/components/search-filters";
import {
  STATUS_LABELS,
  formatDateRange,
  totalPax,
  type RequestStatus,
} from "@/lib/requests";

export const metadata = { title: "Solicitudes — Travel Desk" };

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as RequestStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

export default async function RequestsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const supabase = await createClient();
  const { data: requests } = await supabase.rpc("search_agency_requests", {
    p_agency_id: tenant.agencyId,
    p_query: q || undefined,
    p_status: status || undefined,
  });

  const list = requests ?? [];
  const filtered = q.length > 0 || status.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Agencia</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
            Solicitudes
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pedidos de cotización cargados por tu agencia.
          </p>
        </div>
        <Link href="/agency/requests/new" className="btn-primary">
          + Nueva solicitud
        </Link>
      </div>

      <SearchFilters
        fields={[
          {
            kind: "text",
            name: "q",
            placeholder: "Buscar por código, cliente, destino, operador o pasajero…",
          },
          {
            kind: "select",
            name: "status",
            options: STATUS_OPTIONS,
            placeholder: "Todos los estados",
          },
        ]}
      />

      {list.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-zinc-400">
            {filtered
              ? "No se encontraron solicitudes con esos filtros."
              : "Todavía no cargaste ninguna solicitud."}
          </p>
          {!filtered && (
            <Link href="/agency/requests/new" className="btn-primary">
              Crear la primera
            </Link>
          )}
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Destino</th>
                <th className="px-4 py-2 text-left">Fechas</th>
                <th className="px-4 py-2 text-left">Pax</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {list.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/agency/requests/${r.id}`}
                      className="font-semibold text-zinc-100 underline-offset-4 hover:text-[color:var(--accent-strong)] hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{r.client_name}</td>
                  <td className="px-4 py-3 text-zinc-300">{r.destination}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDateRange(r.departure_date, r.return_date, r.flexible_dates)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {totalPax(r.pax_adults, r.pax_children, r.pax_infants)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      <BspBadge dueDate={r.bsp_due_date} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
