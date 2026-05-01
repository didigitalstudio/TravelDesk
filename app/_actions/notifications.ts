"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
  revalidatePath("/agency");
  revalidatePath("/operator");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/agency");
  revalidatePath("/operator");
  return { ok: true };
}
