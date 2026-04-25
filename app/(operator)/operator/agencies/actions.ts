"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitationAction(token: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/operator/agencies");
  revalidatePath("/operator");
  return { ok: true };
}
