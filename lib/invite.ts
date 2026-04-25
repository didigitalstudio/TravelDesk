import { headers } from "next/headers";

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function buildInviteUrl(token: string): Promise<string> {
  return `${await getOrigin()}/invite/${token}`;
}
