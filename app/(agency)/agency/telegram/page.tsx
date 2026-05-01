import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { TelegramPanel } from "./telegram-panel";

export const metadata = { title: "Telegram — Travel Desk" };

const BOT_USERNAME = "traveld_bot";

export default async function AgencyTelegramPage() {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: link } = await supabase
    .from("telegram_links")
    .select("chat_id, username, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Telegram</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Vinculá tu Telegram para crear solicitudes desde el celular en segundos.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <TelegramPanel
          botUsername={BOT_USERNAME}
          initialLink={
            link
              ? {
                  chatId: link.chat_id.toString(),
                  username: link.username,
                  createdAt: link.created_at,
                }
              : null
          }
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Comandos del bot</h2>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <code>/cotizar Cliente ; Destino ; Notas</code> — crea una solicitud en
            estado borrador.
          </li>
          <li>
            <code>/listar</code> — últimas 5 solicitudes de tu agencia.
          </li>
          <li>
            <code>/vincular CODIGO</code> — vincular el chat con tu cuenta (una vez).
          </li>
          <li>
            <code>/help</code> — ayuda.
          </li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          La solicitud queda como borrador con el cliente y destino que indicaste.
          Después la completás y la enviás a operadores desde{" "}
          <Link href="/agency/requests" className="underline">
            la web
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
