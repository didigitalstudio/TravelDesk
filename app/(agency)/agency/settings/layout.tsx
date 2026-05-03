import { getTenantFeatures } from "@/lib/subscriptions";
import { SettingsTabs } from "./_components/settings-tabs";

export const dynamic = "force-dynamic";

export default async function AgencySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const features = await getTenantFeatures();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Configuración
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
          Tu cuenta
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ajustá los datos de tu agencia, integraciones y acceso personal.
        </p>
      </div>
      <SettingsTabs features={features} />
      {children}
    </div>
  );
}
