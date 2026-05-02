import "server-only";
import { sendMailSafe } from "@/lib/mail/send";
import { requestDispatchedEmail } from "@/lib/mail/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://traveldesk-two.vercel.app";

export async function sendDispatchEmails(opts: {
  requestCode: string;
  destination: string;
  agencyName: string;
  requestId: string;
  operators: Array<{ operator_id: string; member_emails: string[] }>;
}): Promise<void> {
  const detailUrl = `${APP_URL}/operator/requests/${opts.requestId}`;
  const tpl = requestDispatchedEmail({
    agencyName: opts.agencyName,
    requestCode: opts.requestCode,
    destination: opts.destination,
    detailUrl,
  });
  await Promise.all(
    opts.operators
      .filter((op) => op.member_emails.length > 0)
      .map((op) => sendMailSafe({ to: op.member_emails, subject: tpl.subject, html: tpl.html })),
  );
}
