import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const LeadSchema = z.object({
  nombre: z.string().min(2).max(120),
  empresa: z.string().min(2).max(160),
  tipo: z.enum(["agencia", "operador", "ambos"]),
  email: z.string().email(),
  tel: z.string().max(40).optional().default(""),
  msg: z.string().max(2000).optional().default(""),
});

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const { nombre, empresa, tipo, email, tel, msg } = parsed.data;
    const subject = `[Travel Desk] Demo solicitada — ${empresa}`;

    const html = `
<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;color:#18181b;max-width:520px">
  <h2 style="margin:0 0 16px;font-size:18px">Nuevo lead desde la landing</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    <tr><td style="padding:6px 16px 6px 0;color:#71717a;white-space:nowrap">Nombre</td><td><strong>${esc(nombre)}</strong></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#71717a;white-space:nowrap">Empresa</td><td>${esc(empresa)} <span style="color:#71717a">(${tipo})</span></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#71717a;white-space:nowrap">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#71717a;white-space:nowrap">Teléfono</td><td>${esc(tel) || "—"}</td></tr>
  </table>
  ${msg ? `<div style="margin-top:16px;padding:12px 14px;background:#f4f4f5;border-radius:8px;font-size:13px;white-space:pre-wrap">${esc(msg)}</div>` : ""}
  <div style="margin-top:20px;font-size:12px;color:#a1a1aa">Respondé directo a este mail para contactar al lead.</div>
</div>`;

    const { error } = await resend.emails.send({
      from: `Travel Desk <${process.env.RESEND_FROM_EMAIL ?? "notificaciones@didigitalstudio.com"}>`,
      to: [process.env.LEAD_TO_EMAIL ?? "info@didigitalstudio.com"],
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error("[lead] resend error", error);
      return NextResponse.json({ ok: false, error: "No pudimos enviar el mail" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lead] unexpected", e);
    return NextResponse.json({ ok: false, error: "Error inesperado" }, { status: 500 });
  }
}
