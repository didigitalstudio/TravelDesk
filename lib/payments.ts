import type { Database } from "@/types/supabase";
import type { Currency } from "./requests";
import { formatMoney } from "./requests";

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export type PaymentStage =
  | "pending_receipt"
  | "pending_verification"
  | "verified";

export function paymentStage(p: Pick<PaymentRow, "receipt_uploaded_at" | "verified_at">): PaymentStage {
  if (p.verified_at) return "verified";
  if (p.receipt_uploaded_at) return "pending_verification";
  return "pending_receipt";
}

export const PAYMENT_STAGE_LABELS: Record<PaymentStage, string> = {
  pending_receipt: "Pendiente de pago",
  pending_verification: "Pago enviado · esperando verificación",
  verified: "Pago verificado",
};

export const PAYMENT_STAGE_TONES: Record<
  PaymentStage,
  "warn" | "info" | "ok"
> = {
  pending_receipt: "warn",
  pending_verification: "info",
  verified: "ok",
};

export function paymentStageBadgeClasses(stage: PaymentStage): string {
  switch (PAYMENT_STAGE_TONES[stage]) {
    case "ok":
      return "bg-emerald-500/[0.12] text-emerald-200 border-emerald-400/30";
    case "info":
      return "bg-indigo-500/[0.14] text-indigo-200 border-indigo-400/30";
    case "warn":
      return "bg-amber-500/[0.12] text-amber-200 border-amber-400/30";
  }
}

export type CurrencyTotals = Record<Currency, number>;

export function emptyTotals(): CurrencyTotals {
  return { USD: 0, ARS: 0 };
}

export function formatTotals(totals: CurrencyTotals): string {
  const parts: string[] = [];
  if (totals.USD > 0) parts.push(formatMoney(totals.USD, "USD"));
  if (totals.ARS > 0) parts.push(formatMoney(totals.ARS, "ARS"));
  return parts.length ? parts.join(" · ") : "—";
}
