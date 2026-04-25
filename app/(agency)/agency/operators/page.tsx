import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { buildInviteUrl } from "@/lib/invite";
import { CopyButton } from "@/components/copy-button";
import { InviteForm } from "./invite-form";
import { RevokeButton, UnlinkButton } from "./row-actions";

export const metadata = { title: "Operadores — Travel Desk" };

export default async function OperatorsPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();

  const [{ data: links }, { data: invitations }] = await Promise.all([
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
  ]);

  const inviteLinks = await Promise.all(
    (invitations ?? []).map(async (inv) => ({
      ...inv,
      url: await buildInviteUrl(inv.token),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operadores</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Vinculá a los operadores con los que trabajás para poder enviarles solicitudes.
          </p>
        </div>
        <Link
          href="/agency"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Invitar nuevo operador</h2>
        <InviteForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Invitaciones pendientes</h2>
        {inviteLinks.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {inviteLinks.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Expira {new Date(inv.expires_at).toLocaleDateString("es-AR")}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={inv.url}
                      readOnly
                      className="min-w-0 flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
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

      <section>
        <h2 className="mb-3 text-sm font-semibold">Operadores vinculados</h2>
        {(!links || links.length === 0) ? (
          <p className="text-sm text-zinc-500">Aún no hay operadores vinculados.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {links.map((l) => (
              <li
                key={l.operator.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <div className="text-sm font-medium">{l.operator.name}</div>
                  {l.operator.contact_email && (
                    <div className="mt-0.5 text-xs text-zinc-500">{l.operator.contact_email}</div>
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
