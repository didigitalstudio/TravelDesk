/**
 * scripts/wipe-demo-data.ts
 *
 * Limpia los datos cargados por las cuentas demo (agencia + operador)
 * sin borrar las cuentas, ni las tenants, ni el link entre ellas.
 *
 * Borra: solicitudes (cascade a quotes/dispatches/passengers/attachments/
 * payments/reservations), clientes, notifications, telegram_links, drive
 * connections, archivos en Storage (attachments + branding logos),
 * resumenes, operadores invitaciones pendientes.
 *
 * Mantiene: auth.users, agencies, operators, agency_members,
 * operator_members, agency_operator_links.
 *
 * Uso:
 *   npx tsx scripts/wipe-demo-data.ts
 *
 * Necesita .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AGENCY_SLUG = "agencia-demo-publica";
const OPERATOR_SLUG = "operador-demo-publico";
const AGENCY_EMAIL = "agencia-demo@traveldesk.test";
const OPERATOR_EMAIL = "operador-demo@traveldesk.test";

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const u = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return u?.id ?? null;
}

async function listStorageFolder(
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  async function recurse(dir: string) {
    const { data, error } = await admin.storage.from(bucket).list(dir, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const entry of data ?? []) {
      const fullPath = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.id === null && entry.metadata === null) {
        // carpeta
        await recurse(fullPath);
      } else {
        out.push(fullPath);
      }
    }
  }
  await recurse(prefix);
  return out;
}

async function removeStoragePaths(bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const slice = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(bucket).remove(slice);
    if (error) console.warn(`  ⚠ ${bucket} remove batch error: ${error.message}`);
  }
}

async function main() {
  console.log("Resolviendo tenants demo…");
  const { data: agency } = await admin
    .from("agencies")
    .select("id, name")
    .eq("slug", AGENCY_SLUG)
    .maybeSingle();
  const { data: operator } = await admin
    .from("operators")
    .select("id, name")
    .eq("slug", OPERATOR_SLUG)
    .maybeSingle();

  if (!agency || !operator) {
    console.error("No encontré los tenants demo. Corré seed-demo primero.");
    process.exit(1);
  }
  console.log(`  Agencia:  ${agency.name} (${agency.id})`);
  console.log(`  Operador: ${operator.name} (${operator.id})`);

  const agencyUserId = await getUserIdByEmail(AGENCY_EMAIL);
  const operatorUserId = await getUserIdByEmail(OPERATOR_EMAIL);
  console.log(`  User agencia:  ${agencyUserId ?? "—"}`);
  console.log(`  User operador: ${operatorUserId ?? "—"}`);

  // 1. Borrar attachments del bucket storage de la agencia.
  console.log("\nLimpiando bucket attachments…");
  try {
    const attachmentPaths = await listStorageFolder("attachments", agency.id);
    console.log(`  encontrados: ${attachmentPaths.length}`);
    await removeStoragePaths("attachments", attachmentPaths);
  } catch (e) {
    console.warn(`  ⚠ ${(e as Error).message}`);
  }

  // 2. Borrar logos de branding (agencia y operador).
  console.log("Limpiando logos branding…");
  try {
    const agencyLogos = await listStorageFolder("branding", `agencies/${agency.id}`);
    const operatorLogos = await listStorageFolder("branding", `operators/${operator.id}`);
    console.log(`  agencia: ${agencyLogos.length} · operador: ${operatorLogos.length}`);
    await removeStoragePaths("branding", [...agencyLogos, ...operatorLogos]);
  } catch (e) {
    console.warn(`  ⚠ ${(e as Error).message}`);
  }

  // 3. Notifications de los users demo.
  console.log("\nBorrando notifications…");
  if (agencyUserId) await admin.from("notifications").delete().eq("user_id", agencyUserId);
  if (operatorUserId)
    await admin.from("notifications").delete().eq("user_id", operatorUserId);

  // 4. Telegram links de ambos users.
  console.log("Borrando telegram links…");
  if (agencyUserId) await admin.from("telegram_links").delete().eq("user_id", agencyUserId);
  if (operatorUserId)
    await admin.from("telegram_links").delete().eq("user_id", operatorUserId);
  if (agencyUserId)
    await admin.from("telegram_link_codes").delete().eq("user_id", agencyUserId);
  if (operatorUserId)
    await admin.from("telegram_link_codes").delete().eq("user_id", operatorUserId);

  // 5. Drive connection de la agencia.
  console.log("Borrando Drive connection…");
  await admin
    .from("agency_google_drive_connections")
    .delete()
    .eq("agency_id", agency.id);
  // attachment_drive_files se cascadea con attachments, pero por las dudas:
  // (no hay FK directa a agencia, así que no hay nada que borrar aparte).

  // 6. Quote requests de la agencia (cascade a casi todo lo demás).
  console.log("Borrando quote_requests (cascade)…");
  const { data: requests, error: reqErr } = await admin
    .from("quote_requests")
    .select("id")
    .eq("agency_id", agency.id);
  if (reqErr) throw reqErr;
  console.log(`  encontradas: ${requests?.length ?? 0}`);
  if (requests && requests.length > 0) {
    const ids = requests.map((r) => r.id);
    // Borrar primero attachments rows que no cascadean automáticamente del request
    await admin.from("attachments").delete().in("quote_request_id", ids);
    // Borrar reservations explícito (no siempre cascade)
    await admin.from("reservations").delete().in("quote_request_id", ids);
    // Borrar payments
    await admin.from("payments").delete().in("quote_request_id", ids);
    // Borrar passengers
    await admin.from("passengers").delete().in("quote_request_id", ids);
    // Borrar quotes (lleva cascade a quote_items)
    await admin.from("quotes").delete().in("quote_request_id", ids);
    // Borrar dispatches y status history
    await admin.from("quote_request_dispatches").delete().in("quote_request_id", ids);
    await admin.from("quote_request_status_history").delete().in("quote_request_id", ids);
    // Finalmente borrar las requests
    const { error: delReqErr } = await admin
      .from("quote_requests")
      .delete()
      .in("id", ids);
    if (delReqErr) throw delReqErr;
  }

  // 7. Clientes de la agencia.
  console.log("Borrando clientes…");
  await admin.from("clients").delete().eq("agency_id", agency.id);

  // 8. Invitaciones pendientes de la agencia.
  console.log("Borrando invitaciones…");
  await admin.from("invitations").delete().eq("agency_id", agency.id);

  // 9. Reset de branding y request_count en las tenants.
  console.log("Reset de branding y contador…");
  await admin
    .from("agencies")
    .update({ brand_logo_url: null, brand_color: null, request_count: 0 })
    .eq("id", agency.id);
  await admin
    .from("operators")
    .update({ brand_logo_url: null, brand_color: null })
    .eq("id", operator.id);

  console.log("\n========================================");
  console.log("WIPE OK — quedaron limpias las dos demos");
  console.log("========================================");
  console.log("- Users:           preservados");
  console.log("- Tenants:         preservados");
  console.log("- Memberships:     preservados");
  console.log("- Link agency↔op:  preservado");
  console.log("- Solicitudes:     borradas");
  console.log("- Clientes:        borrados");
  console.log("- Adjuntos:        borrados");
  console.log("- Logos / branding: reseteados");
  console.log("- Telegram / Drive: desvinculados");
}

main().catch((err) => {
  console.error("wipe-demo-data failed:", err);
  process.exit(1);
});
