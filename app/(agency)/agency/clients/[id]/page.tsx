import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { ClientForm } from "../_components/client-form";
import { DeleteClientButton } from "../_components/delete-button";

export const metadata = { title: "Cliente — Travel Desk" };

type Params = { id: string };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();

  const [{ data: client }, { data: requests }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("agency_id", tenant.agencyId)
      .maybeSingle(),
    supabase
      .from("quote_requests")
      .select("id, code, status, destination, departure_date, return_date, created_at")
      .eq("agency_id", tenant.agencyId)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  const list = requests ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.full_name}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cliente desde {new Date(client.created_at).toLocaleDateString("es-AR")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/agency/clients"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Volver
          </Link>
          <DeleteClientButton clientId={client.id} fullName={client.full_name} />
        </div>
      </div>

      <ClientForm
        mode="edit"
        initial={{
          id: client.id,
          fullName: client.full_name,
          email: client.email,
          phone: client.phone,
          documentType: client.document_type,
          documentNumber: client.document_number,
          birthDate: client.birth_date,
          address: client.address,
          notes: client.notes,
          documentExpiryDate: client.document_expiry_date,
          nationality: client.nationality,
          city: client.city,
        }}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Historial de viajes</h2>
          <Link
            href={`/agency/requests/new?client_id=${client.id}`}
            className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Nueva solicitud para este cliente
          </Link>
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">Sin viajes asociados todavía.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/agency/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">{r.code}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {r.destination}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
