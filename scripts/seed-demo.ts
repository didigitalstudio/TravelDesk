/**
 * scripts/seed-demo.ts
 *
 * Crea cuentas demo aisladas (agencia y operador) con users ficticios,
 * los vincula entre sí y genera magic links de acceso (sin mandar email).
 *
 * Uso:
 *   SITE_URL=https://traveldesk-two.vercel.app npx tsx scripts/seed-demo.ts
 *
 * Necesita variables en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
const SITE_URL = process.env.SITE_URL ?? "https://traveldesk-two.vercel.app";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AGENCY_EMAIL = "agencia-demo@traveldesk.test";
const OPERATOR_EMAIL = "operador-demo@traveldesk.test";
const AGENCY_PASSWORD = "DemoAgencia2026";
const OPERATOR_PASSWORD = "DemoOperador2026";
const AGENCY_NAME = "Agencia Demo Pública";
const AGENCY_SLUG = "agencia-demo-publica";
const OPERATOR_NAME = "Operador Demo Público";
const OPERATOR_SLUG = "operador-demo-publico";

async function ensureUserWithPassword(email: string, password: string): Promise<string> {
  const { data: existing, error: lookupErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (lookupErr) throw lookupErr;
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    // Update password en cada corrida — idempotente, mantiene credenciales documentadas.
    await admin.auth.admin.updateUserById(found.id, { password });
    return found.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

async function ensureAgency(name: string, slug: string): Promise<string> {
  const { data: existing } = await admin
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("agencies")
    .insert({ name, slug })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert agency failed");
  return data.id;
}

async function ensureOperator(name: string, slug: string, contactEmail: string): Promise<string> {
  const { data: existing } = await admin
    .from("operators")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("operators")
    .insert({ name, slug, contact_email: contactEmail })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert operator failed");
  return data.id;
}

async function ensureAgencyMember(agencyId: string, userId: string) {
  await admin
    .from("agency_members")
    .upsert({ agency_id: agencyId, user_id: userId, role: "owner" }, { onConflict: "agency_id,user_id" });
}

async function ensureOperatorMember(operatorId: string, userId: string) {
  await admin
    .from("operator_members")
    .upsert({ operator_id: operatorId, user_id: userId, role: "owner" }, { onConflict: "operator_id,user_id" });
}

async function ensureLink(agencyId: string, operatorId: string) {
  await admin
    .from("agency_operator_links")
    .upsert({ agency_id: agencyId, operator_id: operatorId }, { onConflict: "agency_id,operator_id" });
}

async function main() {
  console.log("Ensuring demo users (with passwords)…");
  const agencyUserId = await ensureUserWithPassword(AGENCY_EMAIL, AGENCY_PASSWORD);
  const operatorUserId = await ensureUserWithPassword(OPERATOR_EMAIL, OPERATOR_PASSWORD);

  console.log("Ensuring tenants…");
  const agencyId = await ensureAgency(AGENCY_NAME, AGENCY_SLUG);
  const operatorId = await ensureOperator(OPERATOR_NAME, OPERATOR_SLUG, OPERATOR_EMAIL);

  console.log("Ensuring memberships…");
  await ensureAgencyMember(agencyId, agencyUserId);
  await ensureOperatorMember(operatorId, operatorUserId);

  console.log("Linking agency ↔ operator…");
  await ensureLink(agencyId, operatorId);

  console.log("\n========================================");
  console.log("DEMO READY — credenciales");
  console.log("========================================");
  console.log(`Site URL: ${SITE_URL}/login`);
  console.log("");
  console.log(`AGENCIA → ${AGENCY_NAME}`);
  console.log(`  email:    ${AGENCY_EMAIL}`);
  console.log(`  password: ${AGENCY_PASSWORD}`);
  console.log("");
  console.log(`OPERADOR → ${OPERATOR_NAME}`);
  console.log(`  email:    ${OPERATOR_EMAIL}`);
  console.log(`  password: ${OPERATOR_PASSWORD}`);
  console.log("========================================");
  console.log("Tip: ventana privada distinta para cada cuenta así ves ambas sesiones.");
}

main().catch((err) => {
  console.error("seed-demo failed:", err);
  process.exit(1);
});
