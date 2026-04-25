/**
 * scripts/regen-demo-links.ts
 *
 * Regenera magic links para los users demo ya existentes.
 * Útil cuando los links generados por seed-demo expiraron (1h).
 *
 *   npm run demo:links
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.SITE_URL ?? "https://traveldesk-two.vercel.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAILS = [
  { label: "AGENCIA  → Agencia Demo Pública",  email: "agencia-demo@traveldesk.test" },
  { label: "OPERADOR → Operador Demo Público", email: "operador-demo@traveldesk.test" },
];

async function main() {
  for (const { label, email } of DEMO_EMAILS) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback` },
    });
    if (error || !data.properties?.action_link) {
      console.error(`Error para ${email}: ${error?.message ?? "unknown"}`);
      continue;
    }
    console.log(`\n${label}`);
    console.log(`  email: ${email}`);
    console.log(`  link:  ${data.properties.action_link}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
