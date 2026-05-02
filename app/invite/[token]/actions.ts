"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = {
  status: "idle" | "error";
  message?: string;
};

export async function acceptByToken(
  token: string,
  _prev: AcceptState,
  _formData: FormData,
): Promise<AcceptState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("accept_invitation", { p_token: token })
    .single();

  if (error) {
    return { status: "error", message: error.message };
  }

  // Redirige según el kind: si es agency_member o agency_link → /agency, etc.
  // Como `accept_invitation` devuelve jsonb {kind, agency_id, operator_id},
  // usamos `kind` para routear. Si vino operator_link, redirigimos a la lista
  // de agencias del operador.
  const result = data as { kind?: string } | null;
  if (result?.kind === "agency_member") redirect("/agency");
  if (result?.kind === "operator_member") redirect("/operator");
  if (result?.kind === "operator_link") redirect("/operator/settings/agencies");
  redirect("/");
}
