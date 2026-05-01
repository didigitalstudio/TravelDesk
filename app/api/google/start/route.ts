import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { authUrl } from "@/lib/google/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency") {
    return NextResponse.json({ ok: false, error: "agency only" }, { status: 403 });
  }

  const nonce = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("td_google_oauth", JSON.stringify({
    nonce,
    agencyId: tenant.agencyId,
    userId: user.id,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min
  });

  return NextResponse.redirect(authUrl(nonce));
}
