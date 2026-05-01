"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { syncRequestAttachments } from "@/lib/google/sync";

export async function disconnectDrive(): Promise<{ ok: boolean; message?: string }> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return { ok: false, message: "agency only" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_google_drive_connections")
    .delete()
    .eq("agency_id", tenant.agencyId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/agency/integrations");
  return { ok: true };
}

export async function syncRequestToDrive(
  requestId: string,
): Promise<{
  ok: boolean;
  message?: string;
  synced?: number;
  skipped?: number;
  failed?: { name: string; reason: string }[];
}> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return { ok: false, message: "agency only" };
  const res = await syncRequestAttachments(tenant.agencyId, requestId);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/agency/requests/${requestId}`);
  return {
    ok: true,
    synced: res.result?.synced ?? 0,
    skipped: res.result?.skipped ?? 0,
    failed: res.result?.failed ?? [],
  };
}
