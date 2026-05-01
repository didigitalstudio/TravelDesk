"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { userMessageFromError } from "@/lib/errors";

export type ProfileState = { status: "idle" | "ok" | "error"; message?: string };

export async function updateOperatorProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") {
    return { status: "error", message: "No autorizado" };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const contactEmail = (formData.get("contact_email") as string | null)?.trim() ?? "";
  const brandColor = (formData.get("brand_color") as string | null)?.trim() ?? "";

  if (name.length < 2) {
    return { status: "error", message: "El nombre debe tener al menos 2 caracteres." };
  }
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return { status: "error", message: "El email de contacto no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_operator_profile", {
    p_operator_id: tenant.operatorId,
    p_name: name,
    p_contact_email: contactEmail || undefined,
    p_brand_color: brandColor || undefined,
  });
  if (error) return { status: "error", message: userMessageFromError(error) };

  revalidatePath("/operator", "layout");
  return { status: "ok", message: "Cambios guardados." };
}

export async function setOperatorLogoUrl(
  logoUrl: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return { ok: false, message: "No autorizado" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_operator_profile", {
    p_operator_id: tenant.operatorId,
    p_brand_logo_url: logoUrl ?? "",
  });
  if (error) return { ok: false, message: userMessageFromError(error) };
  revalidatePath("/operator", "layout");
  return { ok: true };
}

export async function deleteOperatorLogo(
  storagePath: string,
): Promise<{ ok: boolean; message?: string }> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "operator") return { ok: false, message: "No autorizado" };
  const supabase = await createClient();
  await supabase.storage.from("branding").remove([storagePath]);
  const { error } = await supabase.rpc("update_operator_profile", {
    p_operator_id: tenant.operatorId,
    p_brand_logo_url: "",
  });
  if (error) return { ok: false, message: userMessageFromError(error) };
  revalidatePath("/operator", "layout");
  return { ok: true };
}

// Reuso de las acciones de cuenta (email/password). Las redefino acá para
// mantener server actions co-localizadas; la lógica es idéntica.
export type AccountState = { status: "idle" | "ok" | "error"; message?: string };

export async function updateUserEmail(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const newEmail = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
    return { status: "error", message: "Ingresá un email válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { status: "error", message: error.message };
  return {
    status: "ok",
    message: "Te enviamos un mail al nuevo email para confirmar el cambio.",
  };
}

export async function updateUserPassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";
  if (password.length < 8) {
    return { status: "error", message: "Mínimo 8 caracteres." };
  }
  if (password !== confirm) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: error.message };
  return { status: "ok", message: "Contraseña actualizada." };
}
