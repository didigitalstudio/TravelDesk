"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptQuote(
  quoteId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_quote", { p_quote_id: quoteId });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/requests");
  return { ok: true };
}

export async function acceptQuoteItems(
  quoteId: string,
  itemIds: string[],
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (itemIds.length === 0) {
    return { ok: false, message: "Seleccioná al menos un ítem." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_quote_items", {
    p_quote_id: quoteId,
    p_item_ids: itemIds,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/requests");
  return { ok: true };
}

export async function rejectQuote(
  quoteId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_quote", { p_quote_id: quoteId });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

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
