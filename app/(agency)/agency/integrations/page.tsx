import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { IntegrationsPanel } from "./integrations-panel";

export const metadata = { title: "Integraciones — Travel Desk" };

export default async function AgencyIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ drive_connected?: string; drive_error?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const params = await searchParams;
  const supabase = await createClient();
  const { data: conn } = await supabase
    .from("agency_google_drive_connections")
    .select("drive_folder_name, connected_at")
    .eq("agency_id", tenant.agencyId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Integraciones</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Conectá servicios externos para automatizar parte del flujo.
        </p>
      </div>

      {params.drive_connected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          Google Drive conectado correctamente.
        </div>
      )}
      {params.drive_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          Error conectando Drive: {params.drive_error}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Google Drive</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Sincronizá los documentos de cada expediente a tu Google Drive personal,
          organizados por cliente y solicitud.
        </p>
        <IntegrationsPanel
          connected={
            conn
              ? {
                  folderName: conn.drive_folder_name,
                  connectedAt: conn.connected_at,
                }
              : null
          }
        />
      </section>
    </div>
  );
}
