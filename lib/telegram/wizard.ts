import "server-only";
import { InlineKeyboard } from "grammy";
import type { Draft } from "./conversation";

export { type Draft };

const SERVICE_OPTIONS = [
  { key: "flights",    label: "Vuelos" },
  { key: "hotel",      label: "Hotel" },
  { key: "transfers",  label: "Transfers" },
  { key: "excursions", label: "Excursiones" },
  { key: "package",    label: "Paquete" },
  { key: "cruise",     label: "Crucero" },
  { key: "insurance",  label: "Seguro" },
  { key: "other",      label: "Otro" },
] as const;

export const RULES_TEXT =
  "Reglas para cotizar bien:\n" +
  "- Las fechas se ingresan como dd/mm/yyyy (ej. 15/08/2026)\n" +
  "- Si no tenés fechas firmes, elegí Soy flexible\n" +
  "- Adultos: 12 anios o mas, ninios: 2-11, infantes: 0-2\n" +
  "- Marcá todos los servicios que querés cotizar\n" +
  "- Al final podés despachar a uno o más operadores vinculados";

export function buildPaxKeyboard(step: "pax_adults" | "pax_children" | "pax_infants"): InlineKeyboard {
  const options = step === "pax_adults" ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const kb = new InlineKeyboard();
  options.forEach((n, i) => {
    kb.text(String(n), `pax:${n}`);
    if ((i + 1) % 3 === 0) kb.row();
  });
  return kb;
}

export function buildFlexKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Fechas exactas", "flex:0").row()
    .text("Soy flexible", "flex:1");
}

export function buildServicesKeyboard(selected: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  SERVICE_OPTIONS.forEach((svc, i) => {
    const checked = selected.includes(svc.key);
    kb.text(`${checked ? "/ " : ""}${svc.label}`, `srv:${svc.key}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  kb.row().text(
    selected.length > 0 ? `Listo (${selected.length} sel.)` : "Listo",
    "srv:done",
  );
  return kb;
}

export function buildReviewKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Confirmar", "rev:ok")
    .text("Editar", "rev:edit")
    .row()
    .text("Cancelar", "rev:cancel");
}

export function buildDispatchChoiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Enviar ahora", "disp:now").row()
    .text("Dejar como borrador", "disp:later");
}

export function buildOperatorsKeyboard(
  operators: Array<{ operator_id: string; operator_name: string }>,
  selected: string[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  operators.forEach((op) => {
    const checked = selected.includes(op.operator_id);
    kb.text(`${checked ? "/ " : ""}${op.operator_name}`, `op:${op.operator_id}`).row();
  });
  const count = selected.length;
  if (count > 0) {
    kb.text(`Despachar a ${count} operador${count !== 1 ? "es" : ""}`, "op:done").row();
  }
  kb.text("Cancelar", "op:cancel");
  return kb;
}

export function buildAgencyKeyboard(
  agencies: Array<{ agency_id: string; agency_name: string }>,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  agencies.forEach((ag) => {
    kb.text(ag.agency_name, `ag:${ag.agency_id}`).row();
  });
  return kb;
}

export function parseDateInput(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(iso + "T00:00:00");
  if (isNaN(dt.getTime())) return null;
  return iso;
}

export function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function serviceLabel(key: string): string {
  return SERVICE_OPTIONS.find((s) => s.key === key)?.label ?? key;
}

export function formatReview(draft: Draft): string {
  const lines: string[] = ["Revisá antes de confirmar:\n"];
  lines.push(`Cliente: ${draft.client_name ?? "—"}`);

  const adults = draft.pax_adults ?? 1;
  const children = draft.pax_children ?? 0;
  const infants = draft.pax_infants ?? 0;
  const paxParts = [`${adults} adulto${adults !== 1 ? "s" : ""}`];
  if (children > 0) paxParts.push(`${children} ninio${children !== 1 ? "s" : ""}`);
  if (infants > 0) paxParts.push(`${infants} infante${infants !== 1 ? "s" : ""}`);
  lines.push(`Pasajeros: ${paxParts.join(", ")}`);

  lines.push(`Destino: ${draft.destination ?? "—"}`);

  if (draft.flexible_dates) {
    lines.push("Fechas: Flexibles");
  } else {
    const dep = draft.departure_date ? formatDateDisplay(draft.departure_date) : "—";
    const ret = draft.return_date ? ` → ${formatDateDisplay(draft.return_date)}` : "";
    lines.push(`Fechas: ${dep}${ret}`);
  }

  const svcLabels = (draft.services ?? []).map(serviceLabel);
  lines.push(`Servicios: ${svcLabels.length > 0 ? svcLabels.join(", ") : "—"}`);
  lines.push(`Notas: ${draft.notes ?? "—"}`);

  return lines.join("\n");
}
