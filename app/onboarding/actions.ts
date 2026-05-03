"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  status: "idle" | "error";
  message?: string;
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function notifyAdmin(payload: {
  entity_type: string;
  entity_id: string | null;
  auth_user_id: string;
  email: string;
  nombre: string;
  datos_extra?: Record<string, unknown>;
}) {
  const webhookUrl = process.env.DI_ADMIN_WEBHOOK_URL;
  const webhookSecret = process.env.DI_ADMIN_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) return;
  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${webhookSecret}` },
      body: JSON.stringify({ proyecto: "traveldesk", ...payload }),
    }).catch(() => {});
  } catch { /* silencioso */ }
}

export async function createTenant(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();

  if (kind !== "agency" && kind !== "operator") {
    return { status: "error", message: "Tipo inválido." };
  }
  if (name.length < 2) {
    return { status: "error", message: "El nombre debe tener al menos 2 caracteres." };
  }

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return { status: "error", message: "El nombre no es válido como slug." };
  }
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "No autenticado." };

  if (kind === "agency") {
    const { error } = await supabase.rpc("create_agency", { p_name: name, p_slug: slug });
    if (error) return { status: "error", message: error.message };
    const { data: agency } = await supabase
      .from("agencies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    await notifyAdmin({
      entity_type: "agency",
      entity_id: agency?.id ?? null,
      auth_user_id: user.id,
      email: user.email ?? "",
      nombre: name,
      datos_extra: { agency_name: name },
    });
    redirect("/agency");
  } else {
    const { error } = await supabase.rpc("create_operator", {
      p_name: name,
      p_slug: slug,
      p_contact_email: contactEmail || undefined,
    });
    if (error) return { status: "error", message: error.message };
    const { data: operator } = await supabase
      .from("operators")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    await notifyAdmin({
      entity_type: "operator",
      entity_id: operator?.id ?? null,
      auth_user_id: user.id,
      email: user.email ?? "",
      nombre: name,
      datos_extra: { operator_name: name },
    });
    redirect("/operator");
  }
}
