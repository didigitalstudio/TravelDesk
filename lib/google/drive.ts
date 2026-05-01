import "server-only";
import { google, type drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://traveldesk-two.vercel.app";

export const REDIRECT_URI = `${APP_URL}/api/google/callback`;

export const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function makeOAuthClient(): OAuth2Client {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET missing");
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function authUrl(state: string): string {
  const oauth = makeOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  refreshToken: string | null;
  accessToken: string | null;
}> {
  const oauth = makeOAuthClient();
  const { tokens } = await oauth.getToken(code);
  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
  };
}

export function driveClient(refreshToken: string): drive_v3.Drive {
  const oauth = makeOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth });
}

export async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<{ id: string; name: string }> {
  // Buscar primero si existe
  const safeName = name.replace(/'/g, "\\'");
  const query = [
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${safeName}'`,
    "trashed=false",
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ].join(" and ");
  const list = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    pageSize: 1,
  });
  const existing = list.data.files?.[0];
  if (existing?.id) return { id: existing.id, name: existing.name ?? name };

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id,name",
  });
  return { id: created.data.id!, name: created.data.name ?? name };
}

export async function uploadStream(
  drive: drive_v3.Drive,
  input: {
    folderId: string;
    name: string;
    mimeType?: string;
    body: NodeJS.ReadableStream;
  },
): Promise<{ id: string; webViewLink: string | null }> {
  const res = await drive.files.create({
    requestBody: {
      name: input.name,
      parents: [input.folderId],
    },
    media: {
      mimeType: input.mimeType ?? "application/octet-stream",
      body: input.body,
    },
    fields: "id,webViewLink",
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink ?? null };
}
