import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint manual: GET /api/telegram/setup?secret=<TELEGRAM_WEBHOOK_SECRET>
// Registra la URL del webhook con Telegram. Re-correr si cambia el dominio.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!secret || !token) {
    return NextResponse.json({ ok: false, error: "telegram env vars missing" }, { status: 500 });
  }
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${url.host}`;
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const data = await tgRes.json();
  return NextResponse.json({ ok: tgRes.ok, webhookUrl, telegram: data });
}
