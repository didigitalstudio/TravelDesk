import "server-only";
import { createClient } from "@/lib/supabase/server";

// Las RPCs `relayed_*` permiten cross-tenant lookup gateado por relación
// dispatched/linked. Las RPCs base (`agency_member_emails`, `operator_member_emails`)
// son same-tenant only y se usan dentro de la propia agencia/operador.

export async function agencyEmails(agencyId: string): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("relayed_agency_member_emails", { p_agency_id: agencyId });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}

export async function operatorEmails(operatorId: string): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("relayed_operator_member_emails", { p_operator_id: operatorId });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}
