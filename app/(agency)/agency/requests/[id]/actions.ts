"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function dispatchToOperators(
  requestId: string,
  operatorIds: string[],
): Promise<{ ok: boolean; message?: string }> {
  if (operatorIds.length === 0) {
    return { ok: false, message: "Seleccioná al menos un operador." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_quote_request", {
    p_request_id: requestId,
    p_operator_ids: operatorIds,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/requests");
  return { ok: true };
}

export async function cancelRequest(
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_quote_request", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/requests");
  return { ok: true };
}
