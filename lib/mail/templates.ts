// HTML simple para mails transaccionales. No agrega libs de templating.
// Si en el futuro queremos algo más rico (react-email, mjml), reemplazar acá.

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://traveldesk-two.vercel.app";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(opts: { title: string; body: string; ctaLabel?: string; ctaHref?: string }): string {
  const cta = opts.ctaLabel && opts.ctaHref
    ? `<p style="margin: 24px 0;"><a href="${opts.ctaHref}" style="display:inline-block;padding:10px 18px;background:#0F172A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(opts.ctaLabel)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;margin:0;padding:24px;color:#0F172A;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E2E8F0;padding:28px;">
    <div style="font-size:13px;color:#64748B;margin-bottom:8px;">Travel Desk</div>
    <h1 style="margin:0 0 12px;font-size:18px;">${escapeHtml(opts.title)}</h1>
    <div style="font-size:14px;line-height:1.55;color:#1F2937;">${opts.body}</div>
    ${cta}
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;">Recibís este mail porque sos miembro de un tenant en Travel Desk.</p>
  </div>
</body>
</html>`;
}

export function inviteOperatorLinkEmail(input: {
  agencyName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.agencyName} te invitó a vincularte en Travel Desk`,
    html: shell({
      title: `${input.agencyName} te invita a Travel Desk`,
      body: `<p>Una agencia te quiere vincular como operador en Travel Desk para que puedas recibir solicitudes de cotización.</p>
             <p>Aceptá el vínculo desde el link de abajo.</p>`,
      ctaLabel: "Aceptar invitación",
      ctaHref: input.inviteUrl,
    }),
  };
}

export function requestDispatchedEmail(input: {
  agencyName: string;
  requestCode: string;
  destination: string;
  clientName: string;
  detailUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Nueva solicitud ${input.requestCode} de ${input.agencyName}`,
    html: shell({
      title: `Nueva solicitud ${escapeHtml(input.requestCode)}`,
      body: `<p>${escapeHtml(input.agencyName)} te envió una solicitud de cotización.</p>
             <ul style="padding-left:18px;margin:8px 0;">
               <li>Cliente: <strong>${escapeHtml(input.clientName)}</strong></li>
               <li>Destino: <strong>${escapeHtml(input.destination)}</strong></li>
             </ul>
             <p>Entrá al expediente para cotizar.</p>`,
      ctaLabel: "Ver solicitud",
      ctaHref: input.detailUrl,
    }),
  };
}

export function quoteSubmittedEmail(input: {
  operatorName: string;
  requestCode: string;
  totalLabel: string;
  detailUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.operatorName} cotizó ${input.requestCode}`,
    html: shell({
      title: `Llegó cotización de ${escapeHtml(input.operatorName)}`,
      body: `<p>Para la solicitud <strong>${escapeHtml(input.requestCode)}</strong> recibiste una nueva cotización.</p>
             <p style="font-size:18px;margin:12px 0;"><strong>${escapeHtml(input.totalLabel)}</strong></p>
             <p>Compará y aceptá desde el expediente.</p>`,
      ctaLabel: "Ver expediente",
      ctaHref: input.detailUrl,
    }),
  };
}

export function quoteAcceptedEmail(input: {
  agencyName: string;
  requestCode: string;
  isPartial: boolean;
  detailUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.agencyName} aceptó tu cotización (${input.requestCode})`,
    html: shell({
      title: input.isPartial
        ? `Aceptación parcial: ${escapeHtml(input.requestCode)}`
        : `Aceptación total: ${escapeHtml(input.requestCode)}`,
      body: `<p>${escapeHtml(input.agencyName)} aceptó ${input.isPartial ? "parcialmente" : ""} tu cotización para <strong>${escapeHtml(input.requestCode)}</strong>.</p>
             <p>Cargá la reserva y los comprobantes desde el expediente.</p>`,
      ctaLabel: "Ir al expediente",
      ctaHref: input.detailUrl,
    }),
  };
}

export function paymentReceiptUploadedEmail(input: {
  agencyName: string;
  requestCode: string;
  amountLabel: string;
  detailUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.agencyName} confirmó pago de ${input.requestCode}`,
    html: shell({
      title: `Confirmación de pago — ${escapeHtml(input.requestCode)}`,
      body: `<p>${escapeHtml(input.agencyName)} confirmó el pago por <strong>${escapeHtml(input.amountLabel)}</strong> y subió los comprobantes.</p>
             <p>Verificá los comprobantes para cerrar el expediente.</p>`,
      ctaLabel: "Verificar pago",
      ctaHref: input.detailUrl,
    }),
  };
}

export function clientTripSummaryEmail(input: {
  agencyName: string;
  clientName: string;
  destination: string;
  summaryUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.agencyName} — resumen de tu viaje a ${input.destination}`,
    html: shell({
      title: `Hola ${escapeHtml(input.clientName)} — resumen de tu viaje`,
      body: `<p>Te compartimos el resumen de tu viaje a <strong>${escapeHtml(input.destination)}</strong>.</p>
             <p>Podés consultar el itinerario, los pasajeros y los datos de la reserva en cualquier momento desde el link de abajo.</p>`,
      ctaLabel: "Ver mi viaje",
      ctaHref: input.summaryUrl,
    }),
  };
}

export function paymentVerifiedEmail(input: {
  operatorName: string;
  requestCode: string;
  detailUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${input.operatorName} verificó tu pago (${input.requestCode})`,
    html: shell({
      title: `Pago verificado — ${escapeHtml(input.requestCode)}`,
      body: `<p>${escapeHtml(input.operatorName)} verificó tu comprobante y la solicitud quedó cerrada.</p>`,
      ctaLabel: "Ver expediente",
      ctaHref: input.detailUrl,
    }),
  };
}

export { BASE_URL };
