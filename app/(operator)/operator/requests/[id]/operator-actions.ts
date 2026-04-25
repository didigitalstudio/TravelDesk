"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AttachmentKind } from "@/lib/passengers";

export async function upsertReservation(
  requestId: string,
  reservationCode: string,
  notes?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!reservationCode.trim()) {
    return { ok: false, message: "El código de reserva es obligatorio." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_reservation", {
    p_request_id: requestId,
    p_reservation_code: reservationCode.trim(),
    p_notes: notes?.trim() || undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operator/requests/${requestId}`);
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

export async function registerOperatorAttachment(input: {
  requestId: string;
  operatorId: string;
  kind: AttachmentKind;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<{ ok: boolean; message?: string; id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_attachment", {
    p_request_id: input.requestId,
    p_kind: input.kind,
    p_storage_path: input.storagePath,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType ?? undefined,
    p_size_bytes: input.sizeBytes ?? undefined,
    p_operator_id: input.operatorId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operator/requests/${input.requestId}`);
  revalidatePath(`/agency/requests/${input.requestId}`);
  return { ok: true, id: data ?? undefined };
}

export async function markRequestIssued(
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_request_issued", {
    p_request_id: requestId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operator/requests/${requestId}`);
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}

export async function deleteOperatorAttachment(
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
  revalidatePath(`/operator/requests/${requestId}`);
  revalidatePath(`/agency/requests/${requestId}`);
  return { ok: true };
}
