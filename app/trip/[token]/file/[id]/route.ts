import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { token: string; id: string };

// Endpoint público que valida el token + attachment_id contra una RPC
// security definer y redirige a una signed URL fresca (60s).
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<Response> {
  const { token, id } = await params;
  const supabase = await createClient();

  const { data: storagePath, error } = await supabase.rpc(
    "get_trip_attachment_path",
    { p_token: token, p_attachment_id: id },
  );
  if (error || !storagePath) {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60);
  if (signErr || !signed) {
    return new Response("Signed URL error", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}
