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

export async function registerPaymentReceipt(
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_payment_receipt", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/payments");
  return { ok: true };
}

export async function unregisterPaymentReceipt(
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unregister_payment_receipt", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/payments");
  return { ok: true };
}

export async function registerPaymentReceiptAttachment(input: {
  requestId: string;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<{ ok: boolean; message?: string; id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_attachment", {
    p_request_id: input.requestId,
    p_kind: "payment_receipt",
    p_storage_path: input.storagePath,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType ?? undefined,
    p_size_bytes: input.sizeBytes ?? undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${input.requestId}`);
  return { ok: true, id: data ?? undefined };
}

export async function deletePaymentReceiptAttachment(
  attachmentId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: storagePath, error } = await supabase.rpc("delete_attachment", {
    p_id: attachmentId,
  });
  if (error) return { ok: false, message: error.message };
  if (storagePath) {
    await supabase.storage.from("attachments").remove([storagePath]);
  }
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

export async function getPaymentReceiptSignedUrl(
  storagePath: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60);
  if (error) return { ok: false, message: error.message };
  return { ok: true, url: data.signedUrl };
}
