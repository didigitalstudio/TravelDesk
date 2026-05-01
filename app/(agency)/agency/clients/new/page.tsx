import Link from "next/link";
import { ClientForm } from "../_components/client-form";

export const metadata = { title: "Nuevo cliente — Travel Desk" };

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Nuevo cliente</h1>
        <Link
          href="/agency/clients"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
