import Link from "next/link";
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
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis agencias</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Agencias vinculadas que pueden enviarte solicitudes de cotización.
          </p>
        </div>
        <Link
          href="/operator"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      {linkInvitations.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Invitaciones recibidas</h2>
          <ul className="space-y-2">
            {linkInvitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    {inv.agency_name ?? "Agencia"} te invita a vincularte
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
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

      <section>
        <h2 className="mb-3 text-sm font-semibold">Agencias vinculadas</h2>
        {(!links || links.length === 0) ? (
          <p className="text-sm text-zinc-500">
            Aún no tenés agencias vinculadas. Cuando una agencia te invite, vas a verlo
            acá arriba.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {links.map((l) => (
              <li key={l.agency.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-sm font-medium">{l.agency.name}</div>
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
