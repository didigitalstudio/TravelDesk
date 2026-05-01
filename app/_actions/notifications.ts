"use server";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  return { ok: true };
}
