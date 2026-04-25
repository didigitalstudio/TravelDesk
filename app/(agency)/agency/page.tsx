import { getCurrentTenant } from "@/lib/tenant";

export const metadata = { title: "Portal Agencia — Travel Desk" };

export default async function AgencyHome() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.agencyName}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Workspace creado. Próxima iteración: cargar solicitudes de cotización y vincular operadores.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Solicitudes" description="Cargá un nuevo pedido de cotización." cta="Próximamente" disabled />
        <Card title="Operadores" description="Vinculá operadores con quienes trabajás." cta="Próximamente" disabled />
        <Card title="Cuenta corriente" description="Saldos y vencimientos por operador." cta="Próximamente" disabled />
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  cta,
  disabled,
}: {
  title: string;
  description: string;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      <button
        disabled={disabled}
        className="mt-4 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
      >
        {cta}
      </button>
    </div>
  );
}
