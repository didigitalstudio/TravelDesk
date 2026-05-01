import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { TelegramPanel } from "./telegram-panel";

export const metadata = { title: "Telegram — Travel Desk" };

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "traveld_bot";

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
      <section className="surface p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Telegram</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Vinculá tu Telegram para crear solicitudes desde el celular en segundos.
          </p>
        </header>
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

      <section className="surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Comandos del bot</h3>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-indigo-200">
              /cotizar Cliente ; Destino ; Notas
            </code>{" "}
            — crea una solicitud en estado borrador.
          </li>
          <li>
            <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-indigo-200">
              /listar
            </code>{" "}
            — últimas 5 solicitudes de tu agencia.
          </li>
          <li>
            <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-indigo-200">
              /vincular CODIGO
            </code>{" "}
            — vincular el chat con tu cuenta (una vez).
          </li>
          <li>
            <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-indigo-200">
              /help
            </code>{" "}
            — ayuda.
          </li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          La solicitud queda como borrador con el cliente y destino que indicaste.
          Después la completás y la enviás a operadores desde{" "}
          <Link href="/agency/requests" className="accent-link">
            la web
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
