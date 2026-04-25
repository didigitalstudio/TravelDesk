import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Onboarding — Travel Desk" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (tenant.kind === "agency") redirect("/agency");
  if (tenant.kind === "operator") redirect("/operator");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenido a Travel Desk</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Para empezar, decinos quién sos y armamos tu workspace.
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Logueado como {user.email}
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
