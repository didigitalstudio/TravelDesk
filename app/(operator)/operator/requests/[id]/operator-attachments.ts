"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOperatorAttachmentSignedUrl(
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
