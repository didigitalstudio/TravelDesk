import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import LandingPage from "@/app/_landing/landing-page";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const tenant = await getCurrentTenant();
    if (tenant.kind === "agency") redirect("/agency");
    if (tenant.kind === "operator") redirect("/operator");
    redirect("/onboarding");
  }

  return <LandingPage />;
}
