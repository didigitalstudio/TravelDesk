import { makeWebhookCallback } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = makeWebhookCallback();

export async function POST(req: Request): Promise<Response> {
  return handler(req);
}

export async function GET(): Promise<Response> {
  return new Response("OK", { status: 200 });
}
