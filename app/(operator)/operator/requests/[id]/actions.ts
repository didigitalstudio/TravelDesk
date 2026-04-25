"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/requests";

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
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operator/requests/${input.requestId}`);
  revalidatePath("/operator/requests");
  return { ok: true };
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
