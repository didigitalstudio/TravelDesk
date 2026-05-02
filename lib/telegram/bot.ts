import "server-only";
import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import { createSupabaseAnonClient } from "./supabase-anon";
import { getConversation, setConversation, resetConversation } from "./conversation";
import type { Conversation, Draft } from "./conversation";
import {
  RULES_TEXT,
  buildPaxKeyboard,
  buildFlexKeyboard,
  buildServicesKeyboard,
  buildReviewKeyboard,
  buildDispatchChoiceKeyboard,
  buildOperatorsKeyboard,
  buildAgencyKeyboard,
  parseDateInput,
  formatDateDisplay,
  formatReview,
} from "./wizard";
import { sendDispatchEmails } from "./dispatch";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://traveldesk-two.vercel.app";

export const bot = TOKEN ? new Bot(TOKEN) : null;

type Supa = ReturnType<typeof createSupabaseAnonClient>;

function rpcErrMsg(e: unknown): string {
  return e instanceof Error ? e.message : "error desconocido";
}

function userMsg(msg: string): string | null {
  return msg.startsWith("USER:") ? msg.slice(5).trim() : null;
}

if (bot) {
  // ─── /start ──────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Hola! Soy el bot de Travel Desk.\n\n" +
        RULES_TEXT +
        "\n\nComandos:\n" +
        "/cotizar — armar una solicitud paso a paso\n" +
        "/listar — ver ultimas 5 solicitudes\n" +
        "/cancelar — cancelar el flujo actual\n" +
        "/config — configuracion y reglas\n" +
        "/help — ayuda\n\n" +
        "Para vincular tu cuenta usá /vincular <codigo>\n" +
        "(Genera el codigo en la web → Ajustes → Telegram)",
    );
  });

  // ─── /help ───────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Comandos disponibles:\n\n" +
        "/cotizar — crear solicitud paso a paso\n" +
        "/listar — ultimas 5 solicitudes\n" +
        "/cancelar — cancelar flujo actual\n" +
        "/config — reglas y datos del chat\n\n" +
        "Para vincular: /vincular <codigo>",
    );
  });

  // ─── /config ─────────────────────────────────────────────────────────────
  bot.command("config", async (ctx) => {
    await ctx.reply(
      "Configuracion del bot:\n\n" +
        RULES_TEXT +
        `\n\nChat ID: ${ctx.chat.id}\n` +
        `Usuario: @${ctx.from?.username ?? "(sin username)"}`,
    );
  });

  // ─── /cancelar ───────────────────────────────────────────────────────────
  bot.command("cancelar", async (ctx) => {
    const supabase = createSupabaseAnonClient();
    await resetConversation(supabase, ctx.chat.id);
    await ctx.reply("Flujo cancelado. Podés empezar de nuevo con /cotizar.");
  });

  // ─── /vincular ───────────────────────────────────────────────────────────
  bot.command("vincular", async (ctx) => {
    const arg = (ctx.match ?? "").toString().trim();
    if (!arg) {
      await ctx.reply("Usá: /vincular <codigo>");
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
      await ctx.reply("Codigo invalido o vencido. Genera uno nuevo desde la web.");
      return;
    }
    await ctx.reply("Listo. Tu cuenta quedo vinculada. Proba /cotizar para crear una solicitud.");
  });

  // ─── /listar ─────────────────────────────────────────────────────────────
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
    if (!data || (data as unknown[]).length === 0) {
      await ctx.reply("Sin solicitudes recientes (o el chat no esta vinculado).");
      return;
    }
    const lines = (data as Array<{ request_code: string; client_name: string; destination: string; status: string }>)
      .map((r) => `- ${r.request_code} · ${r.client_name} → ${r.destination} · ${r.status}`);
    await ctx.reply("Ultimas solicitudes:\n" + lines.join("\n"));
  });

  // ─── /cotizar ────────────────────────────────────────────────────────────
  bot.command("cotizar", async (ctx) => {
    const supabase = createSupabaseAnonClient();
    let conv: Conversation;
    try {
      conv = await getConversation(supabase, ctx.chat.id);
    } catch (e) {
      const msg = rpcErrMsg(e);
      if (msg === "chat not linked") {
        await ctx.reply(
          "Tu chat no esta vinculado. Genera un codigo en la web (Ajustes → Telegram) y usá /vincular <codigo>.",
        );
      } else {
        await ctx.reply("Error al iniciar. Intentá de nuevo.");
      }
      return;
    }

    if (conv.step !== "idle") {
      await ctx.reply("Ya tenes un flujo en marcha. Que querés hacer?", {
        reply_markup: new InlineKeyboard()
          .text("Retomar donde estaba", "wiz:resume")
          .row()
          .text("Cancelar y empezar de nuevo", "wiz:restart"),
      });
      return;
    }

    await startWizard(ctx, conv, supabase);
  });

  // ─── Callback query handler ───────────────────────────────────────────────
  bot.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id ?? ctx.callbackQuery.from.id;
    const data = ctx.callbackQuery.data;
    const supabase = createSupabaseAnonClient();

    // Wizard meta-actions
    if (data === "wiz:restart") {
      await resetConversation(supabase, chatId);
      await ctx.answerCallbackQuery("Flujo reiniciado");
      await ctx.editMessageReplyMarkup(undefined).catch(() => {});
      const emptyConv: Conversation = { step: "idle", draft: {}, message_id: null };
      await startWizard(ctx, emptyConv, supabase);
      return;
    }
    if (data === "wiz:resume") {
      await ctx.answerCallbackQuery("Retomando...");
      await ctx.editMessageReplyMarkup(undefined).catch(() => {});
      await ctx.reply("Retomando el flujo. Respondé al ultimo mensaje del bot.");
      return;
    }

    let conv: Conversation;
    try {
      conv = await getConversation(supabase, chatId);
    } catch {
      await ctx.answerCallbackQuery("Chat no vinculado");
      return;
    }

    if (data.startsWith("ag:") && conv.step === "agency_pick") {
      await onAgencyCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("pax:") && (conv.step === "pax_adults" || conv.step === "pax_children" || conv.step === "pax_infants")) {
      await onPaxCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("flex:") && conv.step === "flex_choice") {
      await onFlexCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("srv:") && conv.step === "services") {
      await onServicesCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("rev:") && conv.step === "review") {
      await onReviewCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("disp:") && conv.step === "dispatch_choice") {
      await onDispatchChoiceCallback(ctx, conv, supabase, chatId, data);
    } else if (data.startsWith("op:") && conv.step === "operator_select") {
      await onOperatorSelectCallback(ctx, conv, supabase, chatId, data);
    } else {
      await ctx.answerCallbackQuery();
    }
  });

  // ─── Text message handler ─────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;

    const supabase = createSupabaseAnonClient();
    let conv: Conversation;
    try {
      conv = await getConversation(supabase, ctx.chat.id);
    } catch (e) {
      const msg = rpcErrMsg(e);
      if (msg === "chat not linked") {
        await ctx.reply(
          "Tu chat no esta vinculado. Genera un codigo en la web (Ajustes → Telegram) y usá /vincular <codigo>.",
        );
      }
      return;
    }

    switch (conv.step) {
      case "client_name":    return onClientNameText(ctx, conv, supabase);
      case "pax_adults":
      case "pax_children":
      case "pax_infants":    return onPaxText(ctx, conv, supabase);
      case "destination":    return onDestinationText(ctx, conv, supabase);
      case "departure_date": return onDepartureDateText(ctx, conv, supabase);
      case "return_date":    return onReturnDateText(ctx, conv, supabase);
      case "notes":          return onNotesText(ctx, conv, supabase);
      case "idle":
        await ctx.reply("No hay un flujo activo. Usá /cotizar para armar una solicitud.");
        break;
      default:
        await ctx.reply("Por favor usá los botones del mensaje anterior para continuar.");
    }
  });

  bot.catch((err) => {
    console.error("[telegram] error:", err.error, "update:", err.ctx?.update?.update_id);
  });
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

async function startWizard(ctx: Context, _conv: Conversation, supabase: Supa): Promise<void> {
  const chatId = ctx.chat!.id;
  const { data: agencies, error } = await supabase.rpc("telegram_user_agencies", {
    p_chat_id: chatId,
  });

  if (error || !agencies || (agencies as unknown[]).length === 0) {
    await ctx.reply(
      "No estás vinculado a ninguna agencia. Inicia sesion en " +
        APP_URL +
        " y completá el onboarding.",
    );
    return;
  }

  const agList = agencies as Array<{ agency_id: string; agency_name: string }>;

  if (agList.length === 1) {
    const ag = agList[0];
    const draft: Draft = { agency_id: ag.agency_id, agency_name: ag.agency_name };
    await setConversation(supabase, chatId, "client_name", draft);
    await ctx.reply(
      `Agencia: ${ag.agency_name}\n\nPaso 1 de 8 — Cliente\n¿A nombre de quien es la solicitud?`,
    );
    return;
  }

  await setConversation(supabase, chatId, "agency_pick", {});
  await ctx.reply("Seleccioná la agencia para esta solicitud:", {
    reply_markup: buildAgencyKeyboard(agList),
  });
}

async function onAgencyCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  const agencyId = data.slice(3);
  const { data: agencies } = await supabase.rpc("telegram_user_agencies", { p_chat_id: chatId });
  const ag = (agencies as Array<{ agency_id: string; agency_name: string }> ?? []).find((a) => a.agency_id === agencyId);
  if (!ag) {
    await ctx.answerCallbackQuery("Agencia no encontrada");
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  const draft: Draft = { agency_id: ag.agency_id, agency_name: ag.agency_name };
  await setConversation(supabase, chatId, "client_name", draft);
  await ctx.reply(`Agencia: ${ag.agency_name}\n\nPaso 1 de 8 — Cliente\n¿A nombre de quien es la solicitud?`);
}

async function onClientNameText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const name = (ctx.message!.text ?? "").trim();
  if (name.length < 2 || name.length > 200) {
    await ctx.reply("El nombre debe tener entre 2 y 200 caracteres.");
    return;
  }
  const draft: Draft = { ...conv.draft, client_name: name };
  await setConversation(supabase, ctx.chat!.id, "pax_adults", draft);
  await ctx.reply(`Cliente: ${name}\n\nPaso 2 de 8 — Adultos\n¿Cuantos adultos? (12 anios o mas)`, {
    reply_markup: buildPaxKeyboard("pax_adults"),
  });
}

async function onPaxCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  const n = parseInt(data.slice(4));
  if (isNaN(n) || n < 0) return;

  const step = conv.step as "pax_adults" | "pax_children" | "pax_infants";
  if (step === "pax_adults" && n < 1) {
    await ctx.answerCallbackQuery("Necesitás al menos 1 adulto");
    return;
  }

  const field = step === "pax_adults" ? "pax_adults" : step === "pax_children" ? "pax_children" : "pax_infants";
  const draft: Draft = { ...conv.draft, [field]: n };
  const { nextStep, nextPrompt, keyboard } = getPaxNextStep(step, n);

  await setConversation(supabase, chatId, nextStep, draft);
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await ctx.reply(nextPrompt, keyboard ? { reply_markup: keyboard } : undefined);
}

async function onPaxText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const n = parseInt((ctx.message!.text ?? "").trim());
  const step = conv.step as "pax_adults" | "pax_children" | "pax_infants";

  if (isNaN(n) || n < 0) {
    await ctx.reply("Ingresá un numero valido (mayor o igual a 0).");
    return;
  }
  if (step === "pax_adults" && n < 1) {
    await ctx.reply("Necesitás al menos 1 adulto.");
    return;
  }

  const field = step === "pax_adults" ? "pax_adults" : step === "pax_children" ? "pax_children" : "pax_infants";
  const draft: Draft = { ...conv.draft, [field]: n };
  const { nextStep, nextPrompt, keyboard } = getPaxNextStep(step, n);

  await setConversation(supabase, ctx.chat!.id, nextStep, draft);
  await ctx.reply(nextPrompt, keyboard ? { reply_markup: keyboard } : undefined);
}

function getPaxNextStep(step: "pax_adults" | "pax_children" | "pax_infants", n: number): { nextStep: string; nextPrompt: string; keyboard?: InlineKeyboard } {
  if (step === "pax_adults") {
    return {
      nextStep: "pax_children",
      nextPrompt: `${n} adulto${n !== 1 ? "s" : ""}.\n\nPaso 3 de 8 — Ninios\n¿Cuantos ninios? (2-11 anios)`,
      keyboard: buildPaxKeyboard("pax_children"),
    };
  }
  if (step === "pax_children") {
    return {
      nextStep: "pax_infants",
      nextPrompt: `${n} ninio${n !== 1 ? "s" : ""}.\n\nPaso 4 de 8 — Infantes\n¿Cuantos infantes? (0-2 anios)`,
      keyboard: buildPaxKeyboard("pax_infants"),
    };
  }
  return {
    nextStep: "destination",
    nextPrompt: `${n} infante${n !== 1 ? "s" : ""}.\n\nPaso 5 de 8 — Destino\n¿A donde van?`,
  };
}

async function onDestinationText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const dest = (ctx.message!.text ?? "").trim();
  if (dest.length < 2 || dest.length > 200) {
    await ctx.reply("El destino debe tener entre 2 y 200 caracteres.");
    return;
  }
  const draft: Draft = { ...conv.draft, destination: dest };
  await setConversation(supabase, ctx.chat!.id, "flex_choice", draft);
  await ctx.reply(`Destino: ${dest}\n\nPaso 6 de 8 — Fechas\n¿Las fechas son exactas o flexibles?`, {
    reply_markup: buildFlexKeyboard(),
  });
}

async function onFlexCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  const flexible = data === "flex:1";
  const draft: Draft = { ...conv.draft, flexible_dates: flexible };
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});

  if (flexible) {
    const newDraft: Draft = { ...draft, departure_date: undefined, return_date: undefined };
    await setConversation(supabase, chatId, "services", newDraft);
    await ctx.reply("Fechas flexibles.\n\nPaso 7 de 8 — Servicios\n¿Que servicios incluye el viaje? Marca los que apliquen y tocá Listo:", {
      reply_markup: buildServicesKeyboard([]),
    });
  } else {
    await setConversation(supabase, chatId, "departure_date", draft);
    await ctx.reply("Paso 6a — Fecha de salida\nIngresá la fecha de salida (dd/mm/yyyy):");
  }
}

async function onDepartureDateText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const iso = parseDateInput(ctx.message!.text ?? "");
  if (!iso) {
    await ctx.reply("No pude leer esa fecha. Probá con dd/mm/yyyy, ej. 15/08/2026.");
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (iso < today) {
    await ctx.reply("La fecha de salida no puede ser en el pasado.");
    return;
  }
  const draft: Draft = { ...conv.draft, departure_date: iso };
  await setConversation(supabase, ctx.chat!.id, "return_date", draft);
  await ctx.reply(
    `Salida: ${formatDateDisplay(iso)}\n\nPaso 6b — Fecha de regreso\nIngresá la fecha de regreso (dd/mm/yyyy) o enviá /skip para omitir:`,
  );
}

async function onReturnDateText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const text = (ctx.message!.text ?? "").trim();
  if (text === "/skip") {
    const draft: Draft = { ...conv.draft, return_date: undefined };
    await setConversation(supabase, ctx.chat!.id, "services", draft);
    await ctx.reply("Sin fecha de regreso.\n\nPaso 7 de 8 — Servicios\n¿Que servicios incluye el viaje?", {
      reply_markup: buildServicesKeyboard([]),
    });
    return;
  }
  const iso = parseDateInput(text);
  if (!iso) {
    await ctx.reply("No pude leer esa fecha. Probá con dd/mm/yyyy, ej. 22/08/2026, o enviá /skip para omitir.");
    return;
  }
  if (conv.draft.departure_date && iso < conv.draft.departure_date) {
    await ctx.reply("La fecha de regreso debe ser igual o posterior a la salida.");
    return;
  }
  const draft: Draft = { ...conv.draft, return_date: iso };
  await setConversation(supabase, ctx.chat!.id, "services", draft);
  await ctx.reply(`Regreso: ${formatDateDisplay(iso)}\n\nPaso 7 de 8 — Servicios\n¿Que servicios incluye el viaje?`, {
    reply_markup: buildServicesKeyboard([]),
  });
}

async function onServicesCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  const selected = conv.draft.services ?? [];

  if (data === "srv:done") {
    if (selected.length === 0) {
      await ctx.answerCallbackQuery("Seleccioná al menos un servicio");
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    const draft: Draft = { ...conv.draft };
    await setConversation(supabase, chatId, "notes", draft);
    await ctx.reply("Paso 8 de 8 — Notas\nAgregá notas adicionales o enviá /skip para omitir:");
    return;
  }

  await ctx.answerCallbackQuery();
  const key = data.slice(4);
  const newSelected = selected.includes(key)
    ? selected.filter((s) => s !== key)
    : [...selected, key];
  const draft: Draft = { ...conv.draft, services: newSelected };
  await setConversation(supabase, chatId, "services", draft);
  await ctx.editMessageReplyMarkup({ reply_markup: buildServicesKeyboard(newSelected) }).catch(() => {});
}

async function onNotesText(ctx: Context, conv: Conversation, supabase: Supa): Promise<void> {
  const text = (ctx.message!.text ?? "").trim();
  const notes = text === "/skip" ? undefined : text;
  if (notes && notes.length > 2000) {
    await ctx.reply("Las notas son demasiado largas (max. 2000 caracteres).");
    return;
  }
  const draft: Draft = { ...conv.draft, notes };
  await setConversation(supabase, ctx.chat!.id, "review", draft);
  await ctx.reply(formatReview(draft), { reply_markup: buildReviewKeyboard() });
}

async function onReviewCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});

  if (data === "rev:cancel") {
    await resetConversation(supabase, chatId);
    await ctx.reply("Solicitud cancelada.");
    return;
  }

  if (data === "rev:edit") {
    await setConversation(supabase, chatId, "client_name", conv.draft);
    await ctx.reply(
      "Flujo reiniciado para editar. Respondé cada paso nuevamente.\n\n" +
        `Paso 1 de 8 — Cliente\n¿A nombre de quien es la solicitud? (actual: ${conv.draft.client_name ?? "—"})`,
    );
    return;
  }

  // rev:ok → crear solicitud
  const { data: result, error } = await supabase
    .rpc("telegram_create_full_request", {
      p_chat_id: chatId,
      p_payload: {
        agency_id: conv.draft.agency_id!,
        client_name: conv.draft.client_name!,
        destination: conv.draft.destination!,
        pax_adults: conv.draft.pax_adults ?? 1,
        pax_children: conv.draft.pax_children ?? 0,
        pax_infants: conv.draft.pax_infants ?? 0,
        services: conv.draft.services ?? [],
        flexible_dates: conv.draft.flexible_dates ?? false,
        departure_date: conv.draft.departure_date ?? null,
        return_date: conv.draft.return_date ?? null,
        notes: conv.draft.notes ?? null,
      },
    })
    .single();

  if (error || !result) {
    const msg = error?.message ?? "error desconocido";
    const um = userMsg(msg);
    if (um) {
      await ctx.reply(um);
    } else {
      await ctx.reply("No se pudo crear la solicitud. Intentá de nuevo o usá /cancelar.");
      console.error("[telegram] create_full_request:", msg);
    }
    return;
  }

  const res = result as { request_id: string; request_code: string };
  const newDraft: Draft = { ...conv.draft, request_id: res.request_id, request_code: res.request_code };
  await setConversation(supabase, chatId, "dispatch_choice", newDraft);
  await ctx.reply(`Solicitud ${res.request_code} creada.\n\n¿La enviás ahora a los operadores?`, {
    reply_markup: buildDispatchChoiceKeyboard(),
  });
}

async function onDispatchChoiceCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});

  if (data === "disp:later") {
    const url = `${APP_URL}/agency/requests/${conv.draft.request_id}`;
    await resetConversation(supabase, chatId);
    await ctx.reply(`Solicitud guardada como borrador.\nPodés verla y despacharla desde:\n${url}`);
    return;
  }

  // disp:now → buscar operadores vinculados
  const { data: operators, error } = await supabase.rpc("telegram_list_linked_operators", {
    p_chat_id: chatId,
    p_agency_id: conv.draft.agency_id!,
  });

  if (error || !operators || (operators as unknown[]).length === 0) {
    const url = `${APP_URL}/agency/requests/${conv.draft.request_id}`;
    await resetConversation(supabase, chatId);
    await ctx.reply(
      "No hay operadores vinculados a esta agencia todavia.\n" +
        "Podés despacharla desde la web:\n" +
        url,
    );
    return;
  }

  const ops = operators as Array<{ operator_id: string; operator_name: string }>;
  const draft: Draft = { ...conv.draft, selected_operators: [] };
  await setConversation(supabase, chatId, "operator_select", draft);
  await ctx.reply("Seleccioná los operadores a quienes despachar:", {
    reply_markup: buildOperatorsKeyboard(ops, []),
  });
}

async function onOperatorSelectCallback(ctx: Context, conv: Conversation, supabase: Supa, chatId: number, data: string): Promise<void> {
  const selected = conv.draft.selected_operators ?? [];

  if (data === "op:cancel") {
    await ctx.answerCallbackQuery("Cancelado");
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    const url = `${APP_URL}/agency/requests/${conv.draft.request_id}`;
    await resetConversation(supabase, chatId);
    await ctx.reply(`Despacho cancelado. La solicitud quedo como borrador:\n${url}`);
    return;
  }

  const { data: allOps } = await supabase.rpc("telegram_list_linked_operators", {
    p_chat_id: chatId,
    p_agency_id: conv.draft.agency_id!,
  });
  const operators = (allOps ?? []) as Array<{ operator_id: string; operator_name: string }>;

  if (data === "op:done") {
    if (selected.length === 0) {
      await ctx.answerCallbackQuery("Seleccioná al menos un operador");
      return;
    }
    await ctx.answerCallbackQuery("Despachando...");
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});

    const { data: dispatchResult, error } = await supabase.rpc("telegram_dispatch_request", {
      p_chat_id: chatId,
      p_request_id: conv.draft.request_id!,
      p_operator_ids: selected,
    });

    if (error) {
      await ctx.reply(`No se pudo despachar: ${error.message}. Intentá desde la web.`);
      return;
    }

    // Enviar mails (mejor esfuerzo)
    sendDispatchEmails({
      requestCode: conv.draft.request_code!,
      destination: conv.draft.destination!,
      agencyName: conv.draft.agency_name!,
      requestId: conv.draft.request_id!,
      operators: (dispatchResult ?? []) as Array<{ operator_id: string; member_emails: string[] }>,
    }).catch((e) => console.warn("[telegram] dispatch email error:", e));

    await resetConversation(supabase, chatId);
    const url = `${APP_URL}/agency/requests/${conv.draft.request_id}`;
    const count = selected.length;
    await ctx.reply(
      `Solicitud ${conv.draft.request_code} despachada a ${count} operador${count !== 1 ? "es" : ""}.\n\nVer expediente:\n${url}`,
    );
    return;
  }

  // Toggle operador
  await ctx.answerCallbackQuery();
  const opId = data.slice(3);
  const newSelected = selected.includes(opId)
    ? selected.filter((id) => id !== opId)
    : [...selected, opId];

  const draft: Draft = { ...conv.draft, selected_operators: newSelected };
  await setConversation(supabase, chatId, "operator_select", draft);
  await ctx.editMessageReplyMarkup({ reply_markup: buildOperatorsKeyboard(operators, newSelected) }).catch(() => {});
}

// ─── Webhook factory ──────────────────────────────────────────────────────────

export function makeWebhookCallback() {
  if (!bot) {
    return async (_req: Request) =>
      new Response("Bot not configured", { status: 500 });
  }
  return webhookCallback(bot, "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
}
