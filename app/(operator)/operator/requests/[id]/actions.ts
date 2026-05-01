"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/requests";
import { sendMailSafe } from "@/lib/mail/send";
import { quoteSubmittedEmail } from "@/lib/mail/templates";
import { agencyEmails } from "@/lib/mail/recipients";
import { getOrigin } from "@/lib/invite";
import { userMessageFromError } from "@/lib/errors";

export type QuoteItemInput = { description: string; amount: number };

export type SubmitQuoteInput = {
  requestId: string;
  totalAmount: number;
  currency: Currency;
  paymentTerms?: string;
  validUntil?: string;
  notes?: string;
  exchangeRate?: number;
  items: QuoteItemInput[];
};

export async function submitQuote(
  input: SubmitQuoteInput,
): Promise<{ ok: boolean; message?: string }> {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
    return { ok: false, message: "Total inválido." };
  }
  if (input.currency !== "USD" && input.currency !== "ARS") {
    return { ok: false, message: "Moneda inválida." };
  }
  const items = input.items
    .filter((i) => i.description.trim().length > 0 && Number.isFinite(i.amount))
    .map((i) => ({ description: i.description.trim(), amount: i.amount }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_quote", {
    p_request_id: input.requestId,
    p_total_amount: input.totalAmount,
    p_currency: input.currency,
    p_payment_terms: input.paymentTerms?.trim() || undefined,
    p_valid_until: input.validUntil || undefined,
    p_notes: input.notes?.trim() || undefined,
    p_exchange_rate_usd_ars:
      input.currency === "ARS" && input.exchangeRate ? input.exchangeRate : undefined,
    p_items: items,
  });
  if (error) return { ok: false, message: userMessageFromError(error) };
  revalidatePath(`/operator/requests/${input.requestId}`);
  revalidatePath("/operator/requests");
  await notifyQuoteSubmitted(input.requestId, input.totalAmount, input.currency);
  return { ok: true };
}

async function notifyQuoteSubmitted(
  requestId: string,
  totalAmount: number,
  currency: Currency,
): Promise<void> {
  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { data: req } = await supabase
      .from("quote_requests")
      .select("agency_id, code, agency:agencies!inner(name)")
      .eq("id", requestId)
      .maybeSingle();
    if (!req) return;

    // Resolver el operador del current user (no el primero dispatched al request,
    // que puede no ser el correcto si hay varios).
    const { data: { user } } = await supabase.auth.getUser();
    let dispatch: { operator: { name: string } } | null = null;
    if (user) {
      const { data } = await supabase
        .from("quote_request_dispatches")
        .select(
          "operator:operators!inner(name), operator_members:operator_members!inner(user_id)",
        )
        .eq("quote_request_id", requestId)
        .eq("operator_members.user_id", user.id)
        .limit(1)
        .maybeSingle();
      dispatch = data ? { operator: { name: data.operator.name } } : null;
    }

    const emails = await agencyEmails(req.agency_id, requestId);
    const operatorName = dispatch?.operator.name ?? "El operador";
    const totalLabel = formatMoney(totalAmount, currency);

    const tpl = quoteSubmittedEmail({
      operatorName,
      requestCode: req.code,
      totalLabel,
      detailUrl: `${origin}/agency/requests/${requestId}`,
    });
    if (emails.length > 0) {
      await sendMailSafe({ to: emails, subject: tpl.subject, html: tpl.html });
    }
    await supabase.rpc("notify_agency_members", {
      p_agency_id: req.agency_id,
      p_request_id: requestId,
      p_kind: "quote_submitted",
      p_title: `${operatorName} cotizó ${req.code}`,
      p_body: totalLabel,
      p_link: `/agency/requests/${requestId}`,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[notify] quote submitted", e);
  }
}

export async function withdrawQuote(
  quoteId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_quote", { p_quote_id: quoteId });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operator/requests/${requestId}`);
  return { ok: true };
}
