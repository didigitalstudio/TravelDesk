import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@didigitalstudio.com";

let cached: Resend | null = null;
function client(): Resend | null {
  if (!apiKey) return null;
  if (!cached) cached = new Resend(apiKey);
  return cached;
}

export type MailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendMail(input: MailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const c = client();
  if (!c) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mail] RESEND_API_KEY missing — skipping send", input.subject);
    }
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const recipients = Array.isArray(input.to)
    ? input.to.filter(Boolean)
    : input.to
      ? [input.to]
      : [];
  if (recipients.length === 0) {
    return { ok: false, error: "no recipients" };
  }
  try {
    const { data, error } = await c.emails.send({
      from: `Travel Desk <${fromAddress}>`,
      to: recipients,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return { ok: false, error: message };
  }
}

// Para usar dentro de server actions: nunca debe romper el flow principal.
export async function sendMailSafe(input: MailInput): Promise<void> {
  try {
    const res = await sendMail(input);
    if (!res.ok && process.env.NODE_ENV !== "production") {
      console.warn("[mail] send failed:", res.error, input.subject);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mail] send threw:", e);
    }
  }
}
