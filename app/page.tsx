import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (tenant.kind === "agency") redirect("/agency");
  if (tenant.kind === "operator") redirect("/operator");
  redirect("/onboarding");
}
