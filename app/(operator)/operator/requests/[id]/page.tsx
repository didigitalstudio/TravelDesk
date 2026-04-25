import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import {
  SERVICE_LABELS,
  formatDateRange,
  paxBreakdown,
  totalPax,
} from "@/lib/requests";

export const metadata = { title: "Solicitud — Travel Desk" };

type Params = { id: string };

export default async function OperatorRequestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();

  // Validar que esta solicitud fue despachada a este operador (RLS también lo
  // garantiza, pero es claro a nivel query).
  const { data: dispatch } = await supabase
    .from("quote_request_dispatches")
    .select(
      "sent_at, request:quote_requests!inner(*, agency:agencies!inner(id, name))",
    )
    .eq("operator_id", tenant.operatorId)
    .eq("quote_request_id", id)
    .maybeSingle();

  if (!dispatch) notFound();
  const request = dispatch.request;

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
            De {request.agency.name} · recibida{" "}
            {new Date(dispatch.sent_at).toLocaleString("es-AR")}
          </p>
        </div>
        <Link
          href="/operator/requests"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
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
          <h2 className="mb-2 text-sm font-semibold">Notas de la agencia</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {request.notes}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="mb-1 font-semibold">Cotización</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          La carga de cotización (precio, condiciones de pago, validez) se habilita en la
          próxima iteración.
        </p>
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
