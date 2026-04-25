import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NewRequestForm } from "./new-request-form";

export const metadata = { title: "Nueva solicitud — Travel Desk" };

export default async function NewRequestPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();
  const { data: links } = await supabase
    .from("agency_operator_links")
    .select("operator:operators!inner(id, name)")
    .eq("agency_id", tenant.agencyId)
    .order("created_at", { ascending: false });

  const operators = (links ?? []).map((l) => l.operator);

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

      <NewRequestForm operators={operators} />
    </div>
  );
}
