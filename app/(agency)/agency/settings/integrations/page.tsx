import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getTenantFeatures } from "@/lib/subscriptions";
import { FeatureGate } from "@/components/feature-gate";
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
  const [{ data: conn }, features] = await Promise.all([
    supabase
      .from("agency_google_drive_connections")
      .select("drive_folder_name, connected_at")
      .eq("agency_id", tenant.agencyId)
      .maybeSingle(),
    getTenantFeatures(),
  ]);

  return (
    <div className="space-y-6">
      {params.drive_connected && (
        <div className="surface border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-sm text-emerald-200">
          Google Drive conectado correctamente.
        </div>
      )}
      {params.drive_error && (
        <div className="surface border-rose-500/30 bg-rose-500/[0.06] p-3 text-sm text-rose-200">
          Error conectando Drive: {params.drive_error}
        </div>
      )}

      <FeatureGate
        enabled={features.google_drive ?? false}
        message="Integrá Google Drive para gestionar documentos — disponible en plan Pro"
      >
        <section className="surface p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-zinc-100">Google Drive</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Sincronizá los documentos de cada expediente a tu Google Drive
              personal, organizados por cliente y solicitud.
            </p>
          </header>
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
      </FeatureGate>
    </div>
  );
}
