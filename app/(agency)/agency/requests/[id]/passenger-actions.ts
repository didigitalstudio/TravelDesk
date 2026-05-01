"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PassengerType, AttachmentKind } from "@/lib/passengers";

export type PassengerInput = {
  id?: string;
  fullName: string;
  passengerType: PassengerType;
  documentType?: string;
  documentNumber?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  notes?: string;
  documentExpiryDate?: string;
  nationality?: string;
  city?: string;
};

export async function upsertPassenger(
  requestId: string,
  input: PassengerInput,
): Promise<{ ok: boolean; message?: string; passengerId?: string }> {
  if (!input.fullName.trim()) {
    return { ok: false, message: "El nombre es obligatorio." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_passenger", {
    p_request_id: requestId,
    p_full_name: input.fullName.trim(),
    p_passenger_type: input.passengerType,
    p_document_type: input.documentType?.trim() || undefined,
    p_document_number: input.documentNumber?.trim() || undefined,
    p_birth_date: input.birthDate || undefined,
    p_email: input.email?.trim() || undefined,
    p_phone: input.phone?.trim() || undefined,
    p_notes: input.notes?.trim() || undefined,
    p_id: input.id || undefined,
    p_document_expiry_date: input.documentExpiryDate || undefined,
    p_nationality: input.nationality?.trim() || undefined,
    p_city: input.city?.trim() || undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true, passengerId: data ?? undefined };
}

export async function deletePassenger(
  passengerId: string,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_passenger", { p_id: passengerId });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

export async function registerAttachment(input: {
  requestId: string;
  kind: AttachmentKind;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  passengerId?: string;
  operatorId?: string;
}): Promise<{ ok: boolean; message?: string; id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_attachment", {
    p_request_id: input.requestId,
    p_kind: input.kind,
    p_storage_path: input.storagePath,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType ?? undefined,
    p_size_bytes: input.sizeBytes ?? undefined,
    p_passenger_id: input.passengerId ?? undefined,
    p_operator_id: input.operatorId ?? undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${input.requestId}`);
  revalidatePath(`/operator/requests/${input.requestId}`);
  return { ok: true, id: data ?? undefined };
}

export async function deleteAttachment(
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
  revalidatePath(`/operator/requests/${requestId}`);
  return { ok: true };
}

export async function getAttachmentSignedUrl(
  storagePath: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) {
    return { ok: false, message: error?.message ?? "No se pudo generar el link." };
  }
  return { ok: true, url: data.signedUrl };
}

export async function setAttachmentShared(
  attachmentId: string,
  shared: boolean,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_attachment_shared", {
    p_attachment_id: attachmentId,
    p_shared: shared,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}
