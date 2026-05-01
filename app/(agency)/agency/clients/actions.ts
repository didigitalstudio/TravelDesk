"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientFormState = { status: "idle" | "error"; message?: string };

function emptyToNull(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length === 0 ? undefined : s;
}

export async function upsertClientAction(
  prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const id = emptyToNull(formData.get("id"));
  const fullName = emptyToNull(formData.get("full_name"));
  if (!fullName) {
    return { status: "error", message: "El nombre es obligatorio." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_client", {
    p_full_name: fullName,
    p_email: emptyToNull(formData.get("email")) ?? undefined,
    p_phone: emptyToNull(formData.get("phone")) ?? undefined,
    p_document_type: emptyToNull(formData.get("document_type")) ?? undefined,
    p_document_number: emptyToNull(formData.get("document_number")) ?? undefined,
    p_birth_date: emptyToNull(formData.get("birth_date")) ?? undefined,
    p_address: emptyToNull(formData.get("address")) ?? undefined,
    p_notes: emptyToNull(formData.get("notes")) ?? undefined,
    p_id: id ?? undefined,
  });

  if (error) return { status: "error", message: error.message };

  const newId = id ?? data;
  revalidatePath("/agency/clients");
  if (newId) revalidatePath(`/agency/clients/${newId}`);
  redirect(newId ? `/agency/clients/${newId}` : "/agency/clients");
}

export async function deleteClientAction(
  clientId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_client", { p_id: clientId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/agency/clients");
  return { ok: true };
}
