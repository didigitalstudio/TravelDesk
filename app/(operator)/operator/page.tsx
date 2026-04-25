import { getCurrentTenant } from "@/lib/tenant";

export const metadata = { title: "Portal Operador — Travel Desk" };

export default async function OperatorHome() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.operatorName}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Workspace creado. Próxima iteración: panel de solicitudes recibidas y cotización.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Solicitudes recibidas" description="Cotizá las solicitudes que te mandan las agencias." cta="Próximamente" disabled />
        <Card title="Mis agencias" description="Agencias vinculadas que pueden enviarte pedidos." cta="Próximamente" disabled />
        <Card title="Cuenta corriente" description="Saldos por agencia, pagos verificados." cta="Próximamente" disabled />
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
