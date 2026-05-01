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
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40";
    case "info":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40";
    case "warn":
      return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40";
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
