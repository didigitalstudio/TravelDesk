"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { SERVICE_OPTIONS, type ServiceType } from "@/lib/requests";
import type { RequestFormState } from "../../_components/request-form";

function parseInt0(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseServices(formData: FormData): ServiceType[] {
  const raw = formData.getAll("services").map(String);
  return raw.filter((s): s is ServiceType => SERVICE_OPTIONS.includes(s as ServiceType));
}

export async function updateQuoteRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return { status: "error", message: "Falta el ID de la solicitud." };

  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") {
    return { status: "error", message: "Sólo una agencia puede editar solicitudes." };
  }

  const clientId = String(formData.get("client_id") ?? "").trim() || undefined;
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim() || undefined;
  const clientPhone = String(formData.get("client_phone") ?? "").trim() || undefined;
  const destination = String(formData.get("destination") ?? "").trim();
  const departure = String(formData.get("departure_date") ?? "").trim() || undefined;
  const ret = String(formData.get("return_date") ?? "").trim() || undefined;
  const flexible = formData.get("flexible_dates") === "on";
  const adults = parseInt0(formData.get("pax_adults"));
  const children = parseInt0(formData.get("pax_children"));
  const infants = parseInt0(formData.get("pax_infants"));
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const services = parseServices(formData);

  if (!clientName) return { status: "error", message: "Falta el nombre del cliente." };
  if (!destination) return { status: "error", message: "Falta el destino." };
  if (adults + children + infants < 1) {
    return { status: "error", message: "Tiene que haber al menos un pasajero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_quote_request", {
    p_request_id: requestId,
    p_client_id: clientId,
    p_client_name: clientName,
    p_client_email: clientEmail,
    p_client_phone: clientPhone,
    p_destination: destination,
    p_departure_date: departure,
    p_return_date: ret,
    p_flexible_dates: flexible,
    p_pax_adults: adults || 1,
    p_pax_children: children,
    p_pax_infants: infants,
    p_services: services,
    p_notes: notes,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath(`/agency/requests/${requestId}`);
  redirect(`/agency/requests/${requestId}`);
}

export async function deleteQuoteRequestAction(requestId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_quote_request", { p_request_id: requestId });
  if (error) throw new Error(error.message);

  redirect("/agency/requests");
}
