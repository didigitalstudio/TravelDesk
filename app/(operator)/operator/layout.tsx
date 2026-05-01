import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NotificationsBell } from "@/components/notifications-bell";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (tenant.kind === "none") redirect("/onboarding");
  if (tenant.kind === "agency") redirect("/agency");

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/operator" className="text-base font-semibold tracking-tight">
              Travel Desk
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/operator" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Inicio
              </Link>
              <Link href="/operator/requests" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Solicitudes
              </Link>
              <Link href="/operator/agencies" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Agencias
              </Link>
              <Link href="/operator/payments" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Cobros
              </Link>
              <span className="hidden text-xs uppercase tracking-wider text-zinc-400 lg:inline">
                Portal Operador
              </span>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <NotificationsBell
              initial={(notifs ?? []).map((n) => ({
                id: n.id,
                kind: n.kind,
                title: n.title,
                body: n.body,
                link: n.link,
                readAt: n.read_at,
                createdAt: n.created_at,
              }))}
            />
            <span className="hidden text-zinc-500 sm:inline">{tenant.operatorName}</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
