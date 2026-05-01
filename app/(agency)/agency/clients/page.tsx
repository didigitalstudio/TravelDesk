import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export const metadata = { title: "Clientes — Travel Desk" };

export default async function AgencyClientsPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, document_number, created_at")
    .eq("agency_id", tenant.agencyId)
    .order("full_name", { ascending: true });

  const list = clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Centralizá los datos de tus clientes y reusalos al armar nuevas solicitudes.
          </p>
        </div>
        <Link
          href="/agency/clients/new"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          + Nuevo cliente
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Todavía no cargaste clientes. Cuando crees uno, vas a poder reusarlo en cada solicitud nueva.
        </div>
      ) : (
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/agency/clients/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div>
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-zinc-500">
                      {[c.email, c.phone, c.document_number]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
