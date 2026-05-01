import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { RequestForm } from "../_components/request-form";
import { createQuoteRequest } from "./actions";

export const metadata = { title: "Nueva solicitud — Travel Desk" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const params = await searchParams;
  const presetClientId = params.client_id ?? null;

  const supabase = await createClient();
  const [{ data: links }, presetClient] = await Promise.all([
    supabase
      .from("agency_operator_links")
      .select("operator:operators!inner(id, name)")
      .eq("agency_id", tenant.agencyId)
      .order("created_at", { ascending: false }),
    presetClientId
      ? supabase
          .from("clients")
          .select("id, full_name, email, phone")
          .eq("id", presetClientId)
          .eq("agency_id", tenant.agencyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const operators = (links ?? []).map((l) => l.operator);
  const presetData = presetClient.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nueva solicitud</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cargá los datos del viaje y elegí a qué operadores enviar.
          </p>
        </div>
        <Link
          href="/agency/requests"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      <RequestForm
        mode="create"
        agencyId={tenant.agencyId}
        action={createQuoteRequest}
        operators={operators}
        initial={
          presetData
            ? {
                client_id: presetData.id,
                client_name: presetData.full_name,
                client_email: presetData.email,
                client_phone: presetData.phone,
                destination: "",
                departure_date: null,
                return_date: null,
                flexible_dates: false,
                pax_adults: 1,
                pax_children: 0,
                pax_infants: 0,
                services: [],
                notes: null,
              }
            : undefined
        }
      />
    </div>
  );
}
