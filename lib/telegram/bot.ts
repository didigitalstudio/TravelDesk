import "server-only";
import { Bot, webhookCallback } from "grammy";
import { createSupabaseAnonClient } from "./supabase-anon";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://traveldesk-two.vercel.app";

// Inicializa el bot. Si falta el token, exportamos null y el handler responde 500.
export const bot = TOKEN ? new Bot(TOKEN) : null;

if (bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Hola! Soy el bot de Travel Desk.\n\n" +
        "Para vincular tu cuenta usá:\n" +
        "/vincular <código>\n\n" +
        "(Generá tu código en la web → Agencia → Telegram)\n\n" +
        "Comandos disponibles:\n" +
        "• /cotizar nombre del cliente ; destino ; notas\n" +
        "• /listar — últimas solicitudes\n" +
        "• /help",
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Para crear una solicitud rápido:\n" +
        "/cotizar Juan Pérez ; Cancún ; 7 días, 2 adultos, presupuesto USD 3500\n\n" +
        "Se crea como borrador. Después la completás y la enviás desde la web.",
    );
  });

  bot.command("vincular", async (ctx) => {
    const arg = (ctx.match ?? "").toString().trim();
    if (!arg) {
      await ctx.reply("Usá: /vincular <código>");
      return;
    }
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("consume_telegram_link_code", {
      p_code: arg,
      p_chat_id: ctx.chat.id,
      p_username: ctx.from?.username ?? undefined,
    });
    if (error) {
      await ctx.reply(`Error: ${error.message}`);
      return;
    }
    if (!data) {
      await ctx.reply("Código inválido o vencido. Generá uno nuevo desde la web.");
      return;
    }
    await ctx.reply("Listo. Tu cuenta quedó vinculada. Probá /cotizar o /listar.");
  });

  bot.command("cotizar", async (ctx) => {
    const arg = (ctx.match ?? "").toString().trim();
    if (!arg) {
      await ctx.reply(
        "Usá: /cotizar nombre del cliente ; destino ; notas (opcional)",
      );
      return;
    }
    const parts = arg.split(";").map((s) => s.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      await ctx.reply(
        "Faltan datos. Formato:\n/cotizar nombre del cliente ; destino ; notas",
      );
      return;
    }
    const [clientName, destination, ...rest] = parts;
    const notes = rest.join(" ; ").trim() || null;

    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase
      .rpc("telegram_create_request", {
        p_chat_id: ctx.chat.id,
        p_client_name: clientName,
        p_destination: destination,
        p_notes: notes ?? undefined,
      })
      .single();

    if (error || !data) {
      await ctx.reply(`No se pudo crear: ${error?.message ?? "error desconocido"}.\n\nSi el chat no está vinculado, usá /vincular <código>.`);
      return;
    }

    const url = `${APP_URL}/agency/requests/${data.request_id}`;
    await ctx.reply(
      `Solicitud creada: ${data.request_code}\nCliente: ${clientName}\nDestino: ${destination}\n\nCompletala y enviala a operadores:\n${url}`,
    );
  });

  bot.command("listar", async (ctx) => {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("telegram_list_recent_requests", {
      p_chat_id: ctx.chat.id,
      p_limit: 5,
    });
    if (error) {
      await ctx.reply(`Error: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await ctx.reply("Sin solicitudes (o el chat no está vinculado).");
      return;
    }
    const lines = data.map(
      (r) =>
        `• ${r.request_code} · ${r.client_name} → ${r.destination} · ${r.status}`,
    );
    await ctx.reply(`Últimas solicitudes:\n${lines.join("\n")}`);
  });

  bot.on("message", async (ctx) => {
    // Cualquier mensaje no-comando: respuesta de cortesía.
    if (ctx.message.text?.startsWith("/")) return;
    await ctx.reply(
      "No te entendí. Probá /help para ver los comandos disponibles.",
    );
  });
}

export function makeWebhookCallback() {
  if (!bot) {
    return async (_req: Request) =>
      new Response("Bot not configured", { status: 500 });
  }
  return webhookCallback(bot, "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
}
