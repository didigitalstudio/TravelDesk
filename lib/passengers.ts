import type { Database } from "@/types/supabase";

export type PassengerType = Database["public"]["Enums"]["passenger_type"];
export type AttachmentKind = Database["public"]["Enums"]["attachment_kind"];

export const PASSENGER_TYPE_LABELS: Record<PassengerType, string> = {
  adult: "Adulto",
  child: "Niño",
  infant: "Infante",
};

export const PASSENGER_TYPE_OPTIONS: PassengerType[] = ["adult", "child", "infant"];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  passenger_doc: "Documento de pasajero",
  reservation: "Reserva",
  voucher: "Voucher",
  invoice: "Factura",
  file_doc: "File",
  payment_receipt: "Comprobante de pago",
};

export function buildAttachmentPath(
  agencyId: string,
  requestId: string,
  kind: AttachmentKind,
  fileName: string,
): string {
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const uniq = Math.random().toString(36).slice(2, 10);
  return `${agencyId}/${requestId}/${kind}/${uniq}-${safe}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
