import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function agencyEmails(agencyId: string): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("agency_member_emails", { p_agency_id: agencyId });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}

export async function operatorEmails(operatorId: string): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("operator_member_emails", { p_operator_id: operatorId });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}
