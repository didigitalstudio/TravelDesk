import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface Draft {
  agency_id?: string;
  agency_name?: string;
  client_name?: string;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  destination?: string;
  flexible_dates?: boolean;
  departure_date?: string;  // "YYYY-MM-DD"
  return_date?: string;     // "YYYY-MM-DD"
  services?: string[];
  notes?: string;
  // Seteado después de crear la solicitud
  request_id?: string;
  request_code?: string;
  // Para el step operator_select
  selected_operators?: string[];
}

export interface Conversation {
  step: string;
  draft: Draft;
  message_id: number | null;
}

type AnonClient = SupabaseClient<Database>;

export async function getConversation(supabase: AnonClient, chatId: number): Promise<Conversation> {
  const { data, error } = await supabase
    .rpc("telegram_conv_get", { p_chat_id: chatId })
    .single();
  if (error) throw new Error(error.message);
  const row = data as { r_step: string; r_draft: Draft; r_message_id: number | null };
  return {
    step: row.r_step ?? "idle",
    draft: (row.r_draft ?? {}) as Draft,
    message_id: row.r_message_id ? Number(row.r_message_id) : null,
  };
}

export async function setConversation(
  supabase: AnonClient,
  chatId: number,
  step: string,
  draft: Draft,
  messageId?: number | null,
): Promise<void> {
  const { error } = await supabase.rpc("telegram_conv_set", {
    p_chat_id: chatId,
    p_step: step,
    p_draft: draft as unknown as import("@/types/supabase").Json,
    p_message_id: messageId ?? undefined,
  });
  if (error) throw new Error(error.message);
}

export async function resetConversation(supabase: AnonClient, chatId: number): Promise<void> {
  await supabase.rpc("telegram_conv_reset", { p_chat_id: chatId });
}
