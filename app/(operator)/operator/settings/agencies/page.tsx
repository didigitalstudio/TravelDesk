import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { AcceptButton } from "./accept-button";

export const metadata = { title: "Mis agencias — Travel Desk" };

export default async function AgenciesPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const [{ data: links }, { data: pending }] = await Promise.all([
    supabase
      .from("agency_operator_links")
      .select("created_at, agency:agencies!inner(id, name, slug)")
      .eq("operator_id", tenant.operatorId)
      .order("created_at", { ascending: false }),
    supabase.rpc("pending_invitations_for_email", { p_email: user.email }),
  ]);

  const linkInvitations = (pending ?? []).filter((i) => i.kind === "operator_link");

  return (
    <div className="space-y-6">
      {linkInvitations.length > 0 && (
        <section className="surface p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-zinc-100">
              Invitaciones recibidas
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Aceptá una para que la agencia pueda enviarte solicitudes.
            </p>
          </header>
          <ul className="space-y-2">
            {linkInvitations.map((inv) => (
              <li
                key={inv.id}
                className="surface-flat flex flex-col gap-3 border-amber-500/20 bg-amber-500/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-amber-100">
                    {inv.agency_name ?? "Agencia"} te invita a vincularte
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    Invitación a {inv.email} · expira{" "}
                    {new Date(inv.expires_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <AcceptButton token={inv.token} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Agencias vinculadas
        </h3>
        {(!links || links.length === 0) ? (
          <p className="text-sm text-zinc-500">
            Aún no tenés agencias vinculadas. Cuando una agencia te invite, vas a
            verlo arriba.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {links.map((l) => (
              <li
                key={l.agency.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    {l.agency.name}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Vinculada desde {new Date(l.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
