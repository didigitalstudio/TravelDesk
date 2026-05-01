import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SERVICE_LABELS,
  formatDateRange,
  paxBreakdown,
  totalPax,
  type ServiceType,
} from "@/lib/requests";
import { PASSENGER_TYPE_LABELS, type PassengerType } from "@/lib/passengers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu viaje — Travel Desk" };

type TripSummary = {
  request: {
    code: string;
    client_name: string;
    destination: string;
    departure_date: string | null;
    return_date: string | null;
    flexible_dates: boolean;
    pax_adults: number;
    pax_children: number;
    pax_infants: number;
    services: ServiceType[];
    notes: string | null;
    status: string;
    issued_at: string | null;
    created_at: string;
  };
  agency: {
    name: string;
    brand_color: string | null;
    brand_logo_url: string | null;
  };
  reservation: {
    reservation_code: string;
    notes: string | null;
    operator_name: string;
  } | null;
  passengers: { full_name: string; passenger_type: PassengerType }[];
};

type Params = { token: string };

export default async function TripSummaryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_trip_summary", { p_token: token });

  if (error || !data) notFound();

  const summary = data as TripSummary;
  const accent = summary.agency.brand_color || "#0F172A";

  return (
    <div className="min-h-screen bg-zinc-50 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6 px-6">
        <header
          className="flex items-center justify-between rounded-2xl border bg-white p-6 dark:bg-zinc-900"
          style={{ borderColor: accent }}
        >
          <div className="flex items-center gap-4">
            {summary.agency.brand_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.agency.brand_logo_url}
                alt={summary.agency.name}
                className="h-12 w-12 rounded object-contain"
              />
            )}
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Resumen de viaje
              </div>
              <h1 className="text-lg font-semibold" style={{ color: accent }}>
                {summary.agency.name}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold">
              {summary.request.code}
            </div>
            <div className="text-xs text-zinc-500">
              Para {summary.request.client_name}
            </div>
          </div>
        </header>

        <Section title="Tu viaje">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Destino" value={summary.request.destination} />
            <Detail
              label="Fechas"
              value={formatDateRange(
                summary.request.departure_date,
                summary.request.return_date,
                summary.request.flexible_dates,
              )}
            />
            <Detail
              label="Pasajeros"
              value={`${totalPax(
                summary.request.pax_adults,
                summary.request.pax_children,
                summary.request.pax_infants,
              )} (${paxBreakdown(
                summary.request.pax_adults,
                summary.request.pax_children,
                summary.request.pax_infants,
              )})`}
            />
            <Detail
              label="Estado"
              value={
                summary.request.issued_at
                  ? `Emitido ${new Date(summary.request.issued_at).toLocaleDateString("es-AR")}`
                  : prettyStatus(summary.request.status)
              }
            />
          </div>
        </Section>

        {summary.request.services.length > 0 && (
          <Section title="Servicios incluidos">
            <ul className="flex flex-wrap gap-2 text-sm">
              {summary.request.services.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {SERVICE_LABELS[s] ?? s}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {summary.passengers.length > 0 && (
          <Section title="Pasajeros">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {summary.passengers.map((p, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>{p.full_name}</span>
                  <span className="text-xs text-zinc-500">
                    {PASSENGER_TYPE_LABELS[p.passenger_type] ?? p.passenger_type}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {summary.reservation && (
          <Section title="Reserva">
            <div className="space-y-2 text-sm">
              <Detail
                label="Código de reserva"
                value={summary.reservation.reservation_code}
              />
              <Detail label="Operador" value={summary.reservation.operator_name} />
              {summary.reservation.notes && (
                <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                  {summary.reservation.notes}
                </p>
              )}
            </div>
          </Section>
        )}

        {summary.request.notes && (
          <Section title="Notas">
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {summary.request.notes}
            </p>
          </Section>
        )}

        <p className="text-center text-xs text-zinc-400">
          Travel Desk · {summary.agency.name}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
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

function prettyStatus(s: string): string {
  const map: Record<string, string> = {
    draft: "En preparación",
    sent: "En cotización",
    quoted: "Cotizada",
    partially_accepted: "Aceptada parcial",
    accepted: "Confirmada",
    reserved: "Reservada",
    docs_uploaded: "Con documentación cargada",
    issued: "Emitida",
    payment_pending: "Pago pendiente",
    closed: "Cerrada",
    cancelled: "Cancelada",
  };
  return map[s] ?? s;
}
