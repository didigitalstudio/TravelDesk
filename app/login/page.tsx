import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar — Travel Desk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next?.startsWith("/") ? next : "/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Travel Desk</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ingresá con email y contraseña, o pedí un link mágico.
          </p>
        </div>
        <LoginForm next={next?.startsWith("/") ? next : undefined} />
      </div>
    </main>
  );
}
