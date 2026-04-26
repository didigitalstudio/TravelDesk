import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { BspBadge } from "@/components/bsp-badge";
import { formatDateRange, totalPax } from "@/lib/requests";

export const metadata = { title: "Solicitudes recibidas — Travel Desk" };

export default async function OperatorRequestsListPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();
  // Una solicitud puede tener varios dispatches al mismo operador (no, hay unique).
  // Listamos cada dispatch a este operador con su request asociada.
  const { data: dispatches } = await supabase
    .from("quote_request_dispatches")
    .select(
      "id, sent_at, request:quote_requests!inner(id, code, status, client_name, destination, departure_date, return_date, flexible_dates, pax_adults, pax_children, pax_infants, bsp_due_date, agency:agencies!inner(id, name))",
    )
    .eq("operator_id", tenant.operatorId)
    .order("sent_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitudes recibidas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pedidos de cotización que te enviaron las agencias vinculadas.
          </p>
        </div>
        <Link
          href="/operator"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      {!dispatches || dispatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todavía no recibiste solicitudes. Cuando una agencia te envíe un pedido,
            aparece acá.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Agencia</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Destino</th>
                <th className="px-4 py-2 text-left">Fechas</th>
                <th className="px-4 py-2 text-left">Pax</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Recibida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {dispatches.map((d) => {
                const r = d.request;
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-950/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/operator/requests/${r.id}`}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.agency.name}</td>
                    <td className="px-4 py-3">{r.client_name}</td>
                    <td className="px-4 py-3">{r.destination}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDateRange(r.departure_date, r.return_date, r.flexible_dates)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {totalPax(r.pax_adults, r.pax_children, r.pax_infants)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        <BspBadge dueDate={r.bsp_due_date} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {new Date(d.sent_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
