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

  if (kind === "agency") {
    const { error } = await supabase.rpc("create_agency", { p_name: name, p_slug: slug });
    if (error) return { status: "error", message: error.message };
    redirect("/agency");
  } else {
    const { error } = await supabase.rpc("create_operator", {
      p_name: name,
      p_slug: slug,
      p_contact_email: contactEmail || undefined,
    });
    if (error) return { status: "error", message: error.message };
    redirect("/operator");
  }
}
