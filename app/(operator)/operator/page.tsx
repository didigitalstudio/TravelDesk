import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export const metadata = { title: "Portal Operador — Travel Desk" };

export default async function OperatorHome() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: pending } = user?.email
    ? await supabase.rpc("pending_invitations_for_email", { p_email: user.email })
    : { data: null };
  const pendingCount = pending?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.operatorName}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Workspace del operador. Cuando una agencia te invite, vas a poder vincularte y recibir solicitudes.
        </p>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/operator/agencies"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
        >
          <strong>Tenés {pendingCount} invitación{pendingCount === 1 ? "" : "es"} pendiente{pendingCount === 1 ? "" : "s"}.</strong>{" "}
          <span className="text-zinc-600 dark:text-zinc-400">
            Revisalas y aceptá las que quieras.
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Solicitudes recibidas"
          description="Cotizá las solicitudes que te mandan las agencias."
          cta="Ver"
          href="/operator/requests"
        />
        <Card
          title="Mis agencias"
          description="Agencias vinculadas que pueden enviarte pedidos."
          cta="Gestionar"
          href="/operator/agencies"
        />
        <Card
          title="Cuenta corriente"
          description="Saldos por agencia, pagos verificados."
          cta="Próximamente"
          disabled
        />
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  cta,
  href,
  disabled,
}: {
  title: string;
  description: string;
  cta: string;
  href?: string;
  disabled?: boolean;
}) {
  const cls =
    "mt-4 inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {href && !disabled ? (
        <Link href={href} className={`${cls} hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
          {cta}
        </Link>
      ) : (
        <button disabled className={cls}>
          {cta}
        </button>
      )}
    </div>
  );
}
