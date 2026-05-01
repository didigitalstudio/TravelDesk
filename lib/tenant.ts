import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type TenantContext =
  | { kind: "agency"; agencyId: string; agencyName: string; role: string }
  | { kind: "operator"; operatorId: string; operatorName: string; role: string }
  | { kind: "none" };

export const getCurrentTenant = cache(async (): Promise<TenantContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "none" };

  const [{ data: agencyMembership }, { data: operatorMembership }] = await Promise.all([
    supabase
      .from("agency_members")
      .select("role, agency:agencies!inner(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("operator_members")
      .select("role, operator:operators!inner(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (agencyMembership?.agency) {
    return {
      kind: "agency",
      agencyId: agencyMembership.agency.id,
      agencyName: agencyMembership.agency.name,
      role: agencyMembership.role,
    };
  }
  if (operatorMembership?.operator) {
    return {
      kind: "operator",
      operatorId: operatorMembership.operator.id,
      operatorName: operatorMembership.operator.name,
      role: operatorMembership.role,
    };
  }
  return { kind: "none" };
});
