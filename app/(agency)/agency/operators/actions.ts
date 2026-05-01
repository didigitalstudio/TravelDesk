"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { sendMailSafe } from "@/lib/mail/send";
import { inviteOperatorLinkEmail } from "@/lib/mail/templates";
import { buildInviteUrl } from "@/lib/invite";

export type InviteState = {
  status: "idle" | "ok" | "error";
  message?: string;
  token?: string;
  email?: string;
};

export async function inviteOperatorByEmail(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Ingresá un email válido." };
  }

  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") {
    return { status: "error", message: "Sólo una agencia puede invitar operadores." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_operator_link_invitation", {
      p_agency_id: tenant.agencyId,
      p_email: email,
    })
    .single();

  if (error || !data) {
    return { status: "error", message: error?.message ?? "Error desconocido" };
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", tenant.agencyId)
    .maybeSingle();

  const inviteUrl = await buildInviteUrl(data.token);
  const tpl = inviteOperatorLinkEmail({
    agencyName: agency?.name ?? "Travel Desk",
    inviteUrl,
  });
  await sendMailSafe({ to: email, subject: tpl.subject, html: tpl.html });

  revalidatePath("/agency/operators");
  return { status: "ok", token: data.token, email };
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("revoke_invitation", { p_invitation_id: invitationId });
  revalidatePath("/agency/operators");
}

export async function unlinkOperatorAction(operatorId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return;

  const supabase = await createClient();
  await supabase
    .from("agency_operator_links")
    .delete()
    .eq("agency_id", tenant.agencyId)
    .eq("operator_id", operatorId);
  revalidatePath("/agency/operators");
}
