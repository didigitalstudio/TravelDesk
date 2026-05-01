"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateTelegramLinkCode(): Promise<{
  ok: boolean;
  code?: string;
  message?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_telegram_link_code");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/agency/telegram");
  return { ok: true, code: data ?? undefined };
}

export async function unlinkTelegram(): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no auth" };
  const { error } = await supabase
    .from("telegram_links")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/agency/telegram");
  return { ok: true };
}
