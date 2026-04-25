import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvitationForm } from "./accept-form";

export const metadata = { title: "Aceptar invitación — Travel Desk" };

type Params = { token: string };

export default async function InvitePage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: preview }, { data: userData }] = await Promise.all([
    supabase.rpc("get_invitation_preview", { p_token: token }).single(),
    supabase.auth.getUser(),
  ]);
  const user = userData.user;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">Invitación a Travel Desk</h1>

        {!preview ? (
          <Body
            tone="error"
            title="Invitación no encontrada"
            text="El link no es válido o ya no existe."
            cta={{ href: "/login", label: "Ir a login" }}
          />
        ) : preview.status !== "pending" ? (
          <Body
            tone="error"
            title="Invitación no disponible"
            text={`Esta invitación ya está ${preview.status}.`}
            cta={{ href: "/", label: "Ir al inicio" }}
          />
        ) : new Date(preview.expires_at) < new Date() ? (
          <Body
            tone="error"
            title="Invitación expirada"
            text="Pedile a quien te invitó que genere una nueva."
            cta={{ href: "/", label: "Ir al inicio" }}
          />
        ) : (
          <PreviewBody
            preview={preview}
            user={user}
            token={token}
          />
        )}
      </div>
    </main>
  );
}

function Body({
  tone,
  title,
  text,
  cta,
}: {
  tone: "error" | "ok";
  title: string;
  text: string;
  cta?: { href: string; label: string };
}) {
  const color =
    tone === "error"
      ? "text-red-700 dark:text-red-400"
      : "text-emerald-700 dark:text-emerald-400";
  return (
    <div className="mt-4 space-y-3">
      <p className={`text-sm font-medium ${color}`}>{title}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function PreviewBody({
  preview,
  user,
  token,
}: {
  preview: {
    kind: string;
    email: string;
    agency_name: string | null;
    operator_name: string | null;
  };
  user: { email?: string | null } | null;
  token: string;
}) {
  const headline = describeInvitation(preview);

  if (!user) {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{headline}</p>
        <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-950">
          La invitación es para <strong>{preview.email}</strong>. Iniciá sesión con ese email
          y volvé a este link para aceptar.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Ingresar
        </Link>
      </div>
    );
  }

  const emailMatches = user.email?.toLowerCase() === preview.email.toLowerCase();

  if (!emailMatches) {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{headline}</p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          Esta invitación es para <strong>{preview.email}</strong>, pero estás logueado como{" "}
          <strong>{user.email}</strong>. Cerrá sesión y volvé a entrar con el email correcto.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{headline}</p>
      {preview.kind === "operator_link" && (
        <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-950">
          Para aceptar este vínculo necesitás tener un operador en tu cuenta. Si todavía no
          lo creaste, completá el onboarding y volvé.
        </p>
      )}
      <AcceptInvitationForm token={token} />
    </div>
  );
}

function describeInvitation(preview: {
  kind: string;
  agency_name: string | null;
  operator_name: string | null;
}): string {
  const a = preview.agency_name ?? "la agencia";
  const o = preview.operator_name ?? "el operador";
  switch (preview.kind) {
    case "agency_member":
      return `Te invitaron a sumarte como miembro de la agencia ${a}.`;
    case "operator_member":
      return `Te invitaron a sumarte como miembro del operador ${o}.`;
    case "operator_link":
      return `${a} quiere vincularse con vos como operador para enviarte solicitudes de cotización.`;
    default:
      return "Invitación a Travel Desk.";
  }
}
