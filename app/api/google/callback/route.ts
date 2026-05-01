import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { driveClient, ensureFolder, exchangeCode } from "@/lib/google/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
  const integrationsUrl = new URL("/agency/integrations", baseUrl);

  if (error) {
    integrationsUrl.searchParams.set("drive_error", error);
    return NextResponse.redirect(integrationsUrl);
  }
  if (!code || !state) {
    integrationsUrl.searchParams.set("drive_error", "missing code/state");
    return NextResponse.redirect(integrationsUrl);
  }

  const [stateAgencyId, stateUserId] = state.split("|");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== stateUserId) {
    integrationsUrl.searchParams.set("drive_error", "auth mismatch");
    return NextResponse.redirect(integrationsUrl);
  }
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "agency" || tenant.agencyId !== stateAgencyId) {
    integrationsUrl.searchParams.set("drive_error", "agency mismatch");
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    const { refreshToken } = await exchangeCode(code);
    if (!refreshToken) {
      integrationsUrl.searchParams.set(
        "drive_error",
        "no refresh_token (revoke previous access en Google y volvé a probar)",
      );
      return NextResponse.redirect(integrationsUrl);
    }

    const drive = driveClient(refreshToken);
    const folder = await ensureFolder(drive, "TravelDesk");

    const { error: rpcErr } = await supabase.rpc("upsert_agency_drive_connection", {
      p_agency_id: tenant.agencyId,
      p_refresh_token: refreshToken,
      p_drive_folder_id: folder.id,
      p_drive_folder_name: folder.name,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    integrationsUrl.searchParams.set("drive_connected", "1");
    return NextResponse.redirect(integrationsUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    integrationsUrl.searchParams.set("drive_error", message);
    return NextResponse.redirect(integrationsUrl);
  }
}
