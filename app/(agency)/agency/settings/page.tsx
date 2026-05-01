import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { BrandingForm } from "./_components/branding-form";
import { EmailForm, PasswordForm } from "./_components/account-forms";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") redirect("/");

  const supabase = await createClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, brand_color, brand_logo_url")
    .eq("id", tenant.agencyId)
    .maybeSingle();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!agency || !user) redirect("/");

  const { data: membership } = await supabase
    .from("agency_members")
    .select("role")
    .eq("agency_id", tenant.agencyId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="surface border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
          Sólo los admins de la agencia pueden editar el perfil. Vos podés
          cambiar tu email y contraseña personal.
        </div>
      )}

      {isAdmin && (
        <BrandingForm
          agencyId={agency.id}
          initialName={agency.name}
          initialBrandColor={agency.brand_color}
          initialLogoUrl={agency.brand_logo_url}
        />
      )}

      <section className="surface p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Email</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cambiá el email con el que entrás a Travel Desk.
          </p>
        </header>
        <EmailForm currentEmail={user.email ?? ""} />
      </section>

      <section className="surface p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Contraseña</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Si entrás solo con magic link, podés definir una contraseña para
            usar el login con email y contraseña.
          </p>
        </header>
        <PasswordForm />
      </section>
    </div>
  );
}
