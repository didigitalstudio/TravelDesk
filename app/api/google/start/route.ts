import { NextResponse } from "next/server";
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
  // state: agency_id|user_id (validamos en el callback)
  const state = `${tenant.agencyId}|${user.id}`;
  return NextResponse.redirect(authUrl(state));
}
