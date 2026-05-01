import "server-only";
import { createClient } from "@/lib/supabase/server";

// Las RPCs `relayed_*` permiten cross-tenant lookup gateado por relación
// dispatched a nivel del request específico. Las RPCs base
// (`agency_member_emails`, `operator_member_emails`) son same-tenant only.

export async function agencyEmails(
  agencyId: string,
  requestId: string,
): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("relayed_agency_member_emails", {
    p_agency_id: agencyId,
    p_request_id: requestId,
  });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}

export async function operatorEmails(
  operatorId: string,
  requestId: string,
): Promise<string[]> {
  const s = await createClient();
  const { data, error } = await s.rpc("relayed_operator_member_emails", {
    p_operator_id: operatorId,
    p_request_id: requestId,
  });
  if (error) return [];
  return (data ?? []).filter((e): e is string => Boolean(e));
}
