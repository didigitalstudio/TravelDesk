"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { SERVICE_OPTIONS, type ServiceType } from "@/lib/requests";
import type { RequestFormState } from "../_components/request-form";

function parseInt0(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseServices(formData: FormData): ServiceType[] {
  const raw = formData.getAll("services").map(String);
  return raw.filter((s): s is ServiceType => SERVICE_OPTIONS.includes(s as ServiceType));
}

export async function createQuoteRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") {
    return { status: "error", message: "Sólo una agencia puede crear solicitudes." };
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
  const operatorIds = formData.getAll("operator_ids").map(String).filter(Boolean);
  const sendNow = formData.get("send_now") === "on";

  if (!clientName) return { status: "error", message: "Falta el nombre del cliente." };
  if (!destination) return { status: "error", message: "Falta el destino." };
  if (adults + children + infants < 1) {
    return { status: "error", message: "Tiene que haber al menos un pasajero." };
  }

  const supabase = await createClient();
  const { data: requestId, error } = await supabase.rpc("create_quote_request", {
    p_agency_id: tenant.agencyId,
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

  if (error || !requestId) {
    return { status: "error", message: error?.message ?? "No se pudo crear la solicitud." };
  }

  if (sendNow && operatorIds.length > 0) {
    const { error: sendErr } = await supabase.rpc("send_quote_request", {
      p_request_id: requestId,
      p_operator_ids: operatorIds,
    });
    if (sendErr) {
      return {
        status: "error",
        message: `Solicitud creada pero falló el envío: ${sendErr.message}. Andá al detalle para reintentar.`,
      };
    }
  }

  redirect(`/agency/requests/${requestId}`);
}
