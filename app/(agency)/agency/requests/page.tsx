import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { formatDateRange, totalPax } from "@/lib/requests";

export const metadata = { title: "Solicitudes — Travel Desk" };

export default async function RequestsListPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("quote_requests")
    .select(
      "id, code, status, client_name, destination, departure_date, return_date, flexible_dates, pax_adults, pax_children, pax_infants, created_at",
    )
    .eq("agency_id", tenant.agencyId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pedidos de cotización cargados por tu agencia.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/agency"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Volver
          </Link>
          <Link
            href="/agency/requests/new"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            + Nueva solicitud
          </Link>
        </div>
      </div>

      {!requests || requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todavía no cargaste ninguna solicitud.
          </p>
          <Link
            href="/agency/requests/new"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
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
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-950/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/agency/requests/${r.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.client_name}</td>
                  <td className="px-4 py-3">{r.destination}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateRange(r.departure_date, r.return_date, r.flexible_dates)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {totalPax(r.pax_adults, r.pax_children, r.pax_infants)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
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
