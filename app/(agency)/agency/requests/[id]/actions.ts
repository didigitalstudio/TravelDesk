"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMailSafe } from "@/lib/mail/send";
import {
  clientTripSummaryEmail,
  paymentReceiptUploadedEmail,
  quoteAcceptedEmail,
  requestDispatchedEmail,
} from "@/lib/mail/templates";
import { operatorEmails } from "@/lib/mail/recipients";
import { getOrigin } from "@/lib/invite";
import { formatMoney } from "@/lib/requests";

export async function acceptQuote(
  quoteId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_quote", { p_quote_id: quoteId });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  revalidatePath("/agency/requests");
  await notifyQuoteAccepted(quoteId, requestId, false);
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
  await notifyQuoteAccepted(quoteId, requestId, true);
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
  await notifyDispatch(requestId, operatorIds);
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
  await notifyPaymentReceiptUploaded(requestId);
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

// ============================================================================
// Mail notifications (mejor esfuerzo: nunca rompen el flow del action)
// ============================================================================

async function notifyDispatch(requestId: string, operatorIds: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { data: req } = await supabase
      .from("quote_requests")
      .select("code, destination, client_name, agency:agencies!inner(name)")
      .eq("id", requestId)
      .maybeSingle();
    if (!req) return;
    const detailUrl = `${origin}/operator/requests/${requestId}`;
    for (const opId of operatorIds) {
      const emails = await operatorEmails(opId);
      const tpl = requestDispatchedEmail({
        agencyName: req.agency.name,
        requestCode: req.code,
        destination: req.destination,
        clientName: req.client_name,
        detailUrl,
      });
      if (emails.length > 0) {
        await sendMailSafe({ to: emails, subject: tpl.subject, html: tpl.html });
      }
      await supabase.rpc("notify_operator_members", {
        p_operator_id: opId,
        p_kind: "request_dispatched",
        p_title: `Nueva solicitud ${req.code}`,
        p_body: `${req.agency.name} · ${req.client_name} → ${req.destination}`,
        p_link: `/operator/requests/${requestId}`,
      });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[notify] dispatch", e);
  }
}

async function notifyQuoteAccepted(quoteId: string, requestId: string, partial: boolean): Promise<void> {
  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { data: quote } = await supabase
      .from("quotes")
      .select("operator_id, request:quote_requests!inner(code, agency:agencies!inner(name))")
      .eq("id", quoteId)
      .maybeSingle();
    if (!quote) return;
    const emails = await operatorEmails(quote.operator_id);
    const tpl = quoteAcceptedEmail({
      agencyName: quote.request.agency.name,
      requestCode: quote.request.code,
      isPartial: partial,
      detailUrl: `${origin}/operator/requests/${requestId}`,
    });
    if (emails.length > 0) {
      await sendMailSafe({ to: emails, subject: tpl.subject, html: tpl.html });
    }
    await supabase.rpc("notify_operator_members", {
      p_operator_id: quote.operator_id,
      p_kind: "quote_accepted",
      p_title: `Aceptaron tu cotización (${quote.request.code})`,
      p_body: partial ? "Aceptación parcial" : "Aceptación total",
      p_link: `/operator/requests/${requestId}`,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[notify] quote accepted", e);
  }
}

export async function generateClientSummaryToken(
  requestId: string,
): Promise<{ ok: boolean; token?: string; message?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_client_summary_token", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true, token: data ?? undefined };
}

export async function revokeClientSummaryToken(
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_client_summary_token", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

export async function sendClientSummaryEmail(
  requestId: string,
  toEmail: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!/^\S+@\S+\.\S+$/.test(toEmail)) {
    return { ok: false, message: "Email inválido." };
  }
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("quote_requests")
    .select(
      "client_summary_token, client_name, destination, agency:agencies!inner(name)",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req?.client_summary_token) {
    return { ok: false, message: "Generá el link primero." };
  }
  const origin = await getOrigin();
  const tpl = clientTripSummaryEmail({
    agencyName: req.agency.name,
    clientName: req.client_name,
    destination: req.destination,
    summaryUrl: `${origin}/trip/${req.client_summary_token}`,
  });
  const { sendMail } = await import("@/lib/mail/send");
  const res = await sendMail({ to: toEmail, subject: tpl.subject, html: tpl.html });
  if (!res.ok) return { ok: false, message: res.error ?? "No se pudo enviar." };
  return { ok: true };
}

async function notifyPaymentReceiptUploaded(requestId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { data: payment } = await supabase
      .from("payments")
      .select("operator_id, amount, currency, request:quote_requests!inner(code, agency:agencies!inner(name))")
      .eq("quote_request_id", requestId)
      .maybeSingle();
    if (!payment) return;
    const emails = await operatorEmails(payment.operator_id);
    const amountLabel = formatMoney(Number(payment.amount), payment.currency);
    const tpl = paymentReceiptUploadedEmail({
      agencyName: payment.request.agency.name,
      requestCode: payment.request.code,
      amountLabel,
      detailUrl: `${origin}/operator/requests/${requestId}`,
    });
    if (emails.length > 0) {
      await sendMailSafe({ to: emails, subject: tpl.subject, html: tpl.html });
    }
    await supabase.rpc("notify_operator_members", {
      p_operator_id: payment.operator_id,
      p_kind: "payment_receipt_uploaded",
      p_title: `Confirmación de pago — ${payment.request.code}`,
      p_body: `${payment.request.agency.name} pagó ${amountLabel}`,
      p_link: `/operator/requests/${requestId}`,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[notify] payment receipt", e);
  }
}
