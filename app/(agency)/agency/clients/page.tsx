import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { SearchFilters } from "@/components/search-filters";

export const metadata = { title: "Clientes — Travel Desk" };

export default async function AgencyClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, document_number, created_at")
    .eq("agency_id", tenant.agencyId)
    .order("full_name", { ascending: true })
    .limit(200);
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},document_number.ilike.${pattern}`,
    );
  }
  const { data: clients } = await query;

  const list = clients ?? [];
  const filtered = q.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Agencia</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Centralizá los datos de tus clientes y reusalos al armar nuevas solicitudes.
          </p>
        </div>
        <Link href="/agency/clients/new" className="btn-primary">
          + Nuevo cliente
        </Link>
      </div>

      <SearchFilters
        fields={[
          {
            kind: "text",
            name: "q",
            placeholder: "Buscar por nombre, email o documento…",
          },
        ]}
      />

      {list.length === 0 ? (
        <div className="surface p-6 text-sm text-zinc-400">
          {filtered
            ? "No hay clientes que matcheen la búsqueda."
            : "Todavía no cargaste clientes. Cuando crees uno, vas a poder reusarlo en cada solicitud nueva."}
        </div>
      ) : (
        <section className="surface overflow-hidden">
          <ul className="divide-y divide-white/[0.05]">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/agency/clients/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <div>
                    <div className="font-medium text-zinc-100">{c.full_name}</div>
                    <div className="text-xs text-zinc-500">
                      {[c.email, c.phone, c.document_number].filter(Boolean).join(" · ") ||
                        "—"}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
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
