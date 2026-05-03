import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getTenantFeatures } from "@/lib/subscriptions";
import { buildInviteUrl } from "@/lib/invite";
import { CopyButton } from "@/components/copy-button";
import { FeatureGate } from "@/components/feature-gate";
import { InviteForm } from "./invite-form";
import { RevokeButton, UnlinkButton } from "./row-actions";

export const metadata = { title: "Operadores — Travel Desk" };

export default async function OperatorsPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();

  const [{ data: links }, { data: invitations }, features] = await Promise.all([
    supabase
      .from("agency_operator_links")
      .select("created_at, operator:operators!inner(id, name, slug, contact_email)")
      .eq("agency_id", tenant.agencyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invitations")
      .select("id, email, status, expires_at, created_at, token")
      .eq("agency_id", tenant.agencyId)
      .eq("kind", "operator_link")
      .in("status", ["pending"])
      .order("created_at", { ascending: false }),
    getTenantFeatures(),
  ]);

  const inviteLinks = await Promise.all(
    (invitations ?? []).map(async (inv) => ({
      ...inv,
      url: await buildInviteUrl(inv.token),
    })),
  );

  return (
    <div className="space-y-6">
      <FeatureGate
        enabled={features.multi_user ?? false}
        message="Invitá operadores a tu equipo — disponible en plan Pro"
      >
        <section className="surface p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-zinc-100">Invitar operador</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Mandale el link a tu operador para que se vincule y puedas enviarle
              solicitudes.
            </p>
          </header>
          <InviteForm />
        </section>
      </FeatureGate>

      <section className="surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Invitaciones pendientes
        </h3>
        {inviteLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {inviteLinks.map((inv) => (
              <li
                key={inv.id}
                className="surface-flat flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-100">{inv.email}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Expira {new Date(inv.expires_at).toLocaleDateString("es-AR")}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={inv.url}
                      readOnly
                      className="min-w-0 flex-1 truncate rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-xs text-zinc-300"
                    />
                    <CopyButton value={inv.url} label="Copiar link" />
                  </div>
                </div>
                <RevokeButton invitationId={inv.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Operadores vinculados
        </h3>
        {(!links || links.length === 0) ? (
          <p className="text-sm text-zinc-500">Aún no hay operadores vinculados.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {links.map((l) => (
              <li
                key={l.operator.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    {l.operator.name}
                  </div>
                  {l.operator.contact_email && (
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {l.operator.contact_email}
                    </div>
                  )}
                </div>
                <UnlinkButton operatorId={l.operator.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
