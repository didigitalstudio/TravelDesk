import "server-only";
import { Readable } from "node:stream";
import { createClient } from "@/lib/supabase/server";
import { driveClient, ensureFolder, uploadStream } from "./drive";
import { ATTACHMENT_KIND_LABELS, type AttachmentKind } from "@/lib/passengers";

export type SyncResult = {
  synced: number;
  skipped: number;
  failed: { name: string; reason: string }[];
};

export async function syncRequestAttachments(
  agencyId: string,
  requestId: string,
): Promise<{ ok: boolean; result?: SyncResult; message?: string }> {
  const supabase = await createClient();

  const { data: tokenData, error: tokenErr } = await supabase.rpc(
    "get_agency_drive_refresh_token",
    { p_agency_id: agencyId },
  );
  if (tokenErr) return { ok: false, message: tokenErr.message };
  if (!tokenData) return { ok: false, message: "Drive no está conectado." };

  const { data: connData } = await supabase
    .from("agency_google_drive_connections")
    .select("drive_folder_id")
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!connData?.drive_folder_id) {
    return { ok: false, message: "Carpeta raíz de Drive no encontrada." };
  }

  const { data: request } = await supabase
    .from("quote_requests")
    .select("code, client_name, destination")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { ok: false, message: "Solicitud no encontrada." };

  const { data: attachments } = await supabase
    .from("attachments")
    .select("id, file_name, storage_path, mime_type, kind")
    .eq("quote_request_id", requestId);

  const { data: synced } = await supabase
    .from("attachment_drive_files")
    .select("attachment_id")
    .in("attachment_id", (attachments ?? []).map((a) => a.id));

  const syncedSet = new Set((synced ?? []).map((s) => s.attachment_id));

  const drive = driveClient(tokenData);
  const root = connData.drive_folder_id;

  // /TravelDesk/<client> · <code>/
  const requestFolderName = `${request.client_name} · ${request.code}`;
  const requestFolder = await ensureFolder(drive, requestFolderName, root);

  const folderByKind = new Map<AttachmentKind, string>();

  const result: SyncResult = { synced: 0, skipped: 0, failed: [] };

  for (const a of attachments ?? []) {
    if (syncedSet.has(a.id)) {
      result.skipped += 1;
      continue;
    }
    try {
      const kind = a.kind as AttachmentKind;
      let kindFolderId = folderByKind.get(kind);
      if (!kindFolderId) {
        const folder = await ensureFolder(
          drive,
          ATTACHMENT_KIND_LABELS[kind] ?? kind,
          requestFolder.id,
        );
        kindFolderId = folder.id;
        folderByKind.set(kind, folder.id);
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from("attachments")
        .createSignedUrl(a.storage_path, 60);
      if (signErr || !signed) {
        result.failed.push({ name: a.file_name, reason: signErr?.message ?? "signed url" });
        continue;
      }

      const fetched = await fetch(signed.signedUrl);
      if (!fetched.ok || !fetched.body) {
        result.failed.push({ name: a.file_name, reason: `HTTP ${fetched.status}` });
        continue;
      }

      const stream = Readable.fromWeb(fetched.body as never);

      const uploaded = await uploadStream(drive, {
        folderId: kindFolderId,
        name: a.file_name,
        mimeType: a.mime_type ?? "application/octet-stream",
        body: stream,
      });

      await supabase.rpc("register_drive_sync", {
        p_attachment_id: a.id,
        p_drive_file_id: uploaded.id,
        p_drive_file_url: uploaded.webViewLink ?? undefined,
      });
      result.synced += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "error";
      result.failed.push({ name: a.file_name, reason: message });
    }
  }

  return { ok: true, result };
}
