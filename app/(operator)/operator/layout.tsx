import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NotificationsBell } from "@/components/notifications-bell";
import { PortalSidebar } from "@/components/portal-sidebar";
import { AccountBlocked } from "@/components/account-blocked";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/operator", label: "Inicio" },
  { href: "/operator/requests", label: "Solicitudes" },
  { href: "/operator/payments", label: "Cobros" },
  { href: "/operator/settings", label: "Configuración" },
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

  if (tenant.kind === "operator") {
    const { data: operatorData } = await supabase
      .from("operators")
      .select("aprobado")
      .eq("id", tenant.operatorId)
      .single();
    if (operatorData && operatorData.aprobado === false) {
      return <AccountBlocked variant="pending" />;
    }
    const { data: subData } = await supabase
      .from("tenant_subscriptions")
      .select("estado")
      .eq("tenant_id", tenant.operatorId)
      .eq("tenant_type", "operator")
      .maybeSingle();
    if ((subData as { estado?: string } | null)?.estado === "paused") {
      return <AccountBlocked variant="paused" />;
    }
  }

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen">
      <PortalSidebar
        brandHref="/operator"
        portalLabel="Portal Operador"
        navItems={NAV_ITEMS}
        tenantName={tenant.operatorName}
        userEmail={user.email ?? ""}
        topRightSlot={
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
        }
        footerSlot={
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost w-full">
              Salir
            </button>
          </form>
        }
      />
      <main className="px-6 py-8 md:pl-[calc(16rem+1.5rem)]">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
