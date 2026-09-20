import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/mailer";
import { emailVerificationHtml } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const cooldownMs = 300_000;
const json = (body: object, status = 200, retry = 0) => NextResponse.json(body, {
  status, headers: { ...headers, ...(retry ? { "Retry-After": String(retry) } : {}) },
});


async function handle(request: Request, send: boolean) {
  const match = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > 16384) return json({ error: "Sign in again." }, 401);
  let user;
  try {
    const identity = await getAdminAuth().verifyIdToken(match[1], true);
    // Auth is authoritative, including verification completed after the token was issued.
    user = await getAdminAuth().getUser(identity.uid);
    if (user.disabled) return json({ error: "Sign in again." }, 401);
  } catch { return json({ error: "Sign in again." }, 401); }
  if (!user.email) return json({ error: "This account has no email address." }, 400);
  if (user.emailVerified) return json({ verified: true, retryAfterSeconds: 0 });

  try {
    const db = getAdminDb();
    const ref = db.collection("emailVerificationRequests").doc(user.uid);
    if (!send) {
      const record = await ref.get();
      const remaining = Math.max(0, Math.ceil((Number(record.data()?.nextSendAt || 0) - Date.now()) / 1000));
      return json({ verified: false, retryAfterSeconds: remaining });
    }
    // Reserve atomically before SMTP; simultaneous requests on two devices send once.
    const wait = await db.runTransaction(async tx => {
      const record = await tx.get(ref);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((Number(record.data()?.nextSendAt || 0) - now) / 1000));
      if (remaining) return remaining;
      tx.set(ref, { nextSendAt: now + cooldownMs });
      return 0;
    });
    if (wait) return json({ verified: false, retryAfterSeconds: wait }, 429, wait);
    try {
      const link = await getAdminAuth().generateEmailVerificationLink(user.email);
      await sendMail({ to: user.email, subject: "Verify your Kawal Quest email",
        html: emailVerificationHtml(link, "https://www.kawalquest.online") });
      return json({ verified: false, retryAfterSeconds: 300 });
    } catch {
      // SMTP can accept mail before a connection fails. Keep the reservation to prevent duplicates.
      return json({ error: "Unable to confirm delivery. Check your inbox or retry in five minutes.", retryAfterSeconds: 300 }, 503, 300);
    }
  } catch { return json({ error: "Email service unavailable. Try again later." }, 503); }
}
export async function GET(request: Request) { return handle(request, false); }
export async function POST(request: Request) { return handle(request, true); }
