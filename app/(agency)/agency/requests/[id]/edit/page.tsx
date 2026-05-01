import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { RequestForm } from "../../_components/request-form";
import { updateQuoteRequest } from "./actions";

export const metadata = { title: "Editar solicitud — Travel Desk" };

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("quote_requests")
    .select(
      "id, code, status, client_id, client_name, client_email, client_phone, destination, departure_date, return_date, flexible_dates, pax_adults, pax_children, pax_infants, services, notes",
    )
    .eq("id", id)
    .eq("agency_id", tenant.agencyId)
    .maybeSingle();

  if (!request) notFound();
  if (request.status !== "draft" && request.status !== "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Esta solicitud ya no se puede editar.
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Una vez que un operador empieza a cotizar, los datos quedan congelados.
          </p>
        </div>
        <Link
          href={`/agency/requests/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver al expediente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar <span className="font-mono">{request.code}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Los cambios se reflejan en el expediente del operador apenas refresque.
          </p>
        </div>
        <Link
          href={`/agency/requests/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      <RequestForm
        mode="edit"
        agencyId={tenant.agencyId}
        action={updateQuoteRequest}
        hiddenFields={{ request_id: id }}
        initial={{
          client_id: request.client_id,
          client_name: request.client_name,
          client_email: request.client_email,
          client_phone: request.client_phone,
          destination: request.destination,
          departure_date: request.departure_date,
          return_date: request.return_date,
          flexible_dates: request.flexible_dates,
          pax_adults: request.pax_adults,
          pax_children: request.pax_children,
          pax_infants: request.pax_infants,
          services: request.services,
          notes: request.notes,
        }}
      />
    </div>
  );
}
