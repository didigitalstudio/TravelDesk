import type { Database } from "@/types/supabase";

export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type ServiceType = Database["public"]["Enums"]["service_type"];
export type Currency = Database["public"]["Enums"]["currency"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD",
  ARS: "ARS",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: "Enviada",
  withdrawn: "Retirada",
  superseded: "Reemplazada",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  flights: "Vuelos",
  hotel: "Hotel",
  transfers: "Transfers",
  excursions: "Excursiones",
  package: "Paquete completo",
  cruise: "Crucero",
  insurance: "Asistencia / Seguro",
  other: "Otro",
};

export const SERVICE_OPTIONS: ServiceType[] = [
  "flights",
  "hotel",
  "transfers",
  "excursions",
  "package",
  "cruise",
  "insurance",
  "other",
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  quoted: "Cotizada",
  partially_accepted: "Aceptada parcial",
  accepted: "Aceptada",
  reserved: "Reservada",
  docs_uploaded: "Docs cargados",
  issued: "Emitida",
  payment_pending: "Pago pendiente",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

export const STATUS_TONES: Record<
  RequestStatus,
  "neutral" | "info" | "warn" | "ok" | "danger"
> = {
  draft: "neutral",
  sent: "info",
  quoted: "info",
  partially_accepted: "warn",
  accepted: "ok",
  reserved: "ok",
  docs_uploaded: "ok",
  issued: "ok",
  payment_pending: "warn",
  closed: "neutral",
  cancelled: "danger",
};

export function statusBadgeClasses(status: RequestStatus): string {
  switch (STATUS_TONES[status]) {
    case "ok":
      return "bg-emerald-500/[0.12] text-emerald-200 border-emerald-400/30";
    case "warn":
      return "bg-amber-500/[0.12] text-amber-200 border-amber-400/30";
    case "danger":
      return "bg-rose-500/[0.12] text-rose-200 border-rose-400/30";
    case "info":
      return "bg-indigo-500/[0.14] text-indigo-200 border-indigo-400/30";
    default:
      return "bg-white/[0.06] text-zinc-300 border-white/[0.08]";
  }
}

export function totalPax(adults: number, children: number, infants: number): number {
  return adults + children + infants;
}

export function paxBreakdown(adults: number, children: number, infants: number): string {
  const parts: string[] = [];
  if (adults) parts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
  if (children) parts.push(`${children} niño${children === 1 ? "" : "s"}`);
  if (infants) parts.push(`${infants} infante${infants === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "—";
}

// Parsea "YYYY-MM-DD" como fecha local (no UTC). Esto evita el bug de
// Safari iOS donde new Date("2026-05-01") da Invalid Date, y también el de
// otros navegadores que interpretan UTC midnight y muestran el día anterior
// en zonas con offset negativo respecto a UTC.
function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(s);
}

export function formatLocalDate(s: string | null): string {
  if (!s) return "—";
  return parseLocalDate(s).toLocaleDateString("es-AR");
}

export function formatDateRange(
  from: string | null,
  to: string | null,
  flexible: boolean,
): string {
  if (flexible && !from && !to) return "Fechas flexibles";
  const f = from ? parseLocalDate(from).toLocaleDateString("es-AR") : "—";
  const t = to ? parseLocalDate(to).toLocaleDateString("es-AR") : "—";
  if (from && to) return `${f} → ${t}${flexible ? " (flex)" : ""}`;
  if (from) return `${f}${flexible ? " (flex)" : ""}`;
  if (to) return `→ ${t}${flexible ? " (flex)" : ""}`;
  return flexible ? "Fechas flexibles" : "—";
}
