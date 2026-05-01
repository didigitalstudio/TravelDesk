import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NotificationsBell } from "@/components/notifications-bell";
import { PortalHeader } from "@/components/portal-header";

const NAV_ITEMS = [
  { href: "/operator", label: "Inicio" },
  { href: "/operator/requests", label: "Solicitudes" },
  { href: "/operator/agencies", label: "Agencias" },
  { href: "/operator/payments", label: "Cobros" },
];

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
    <div className="min-h-screen">
      <PortalHeader
        brandHref="/operator"
        portalLabel="Portal Operador"
        navItems={NAV_ITEMS}
        rightSlot={
          <>
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
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-xs font-medium text-zinc-200">{tenant.operatorName}</span>
              <span className="text-[11px] text-zinc-500">{user.email}</span>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost">
                Salir
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
