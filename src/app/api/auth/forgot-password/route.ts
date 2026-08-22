import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/mailer";

const RESET_COOLDOWN_MS = 4 * 60 * 1000;

// In-memory only: resets on server restart and isn't shared across instances.
// Good enough for this single-instance admin project; swap for a shared store
// (e.g. Firestore/Redis) if this ever runs behind multiple server instances.
const nextAllowedAt = new Map<string, number>();

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return new URL(origin).host === new URL(request.url).host;
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
}

function resetEmailHtml(link: string): string {
  return `<p>Hello,</p>
<p>Follow this link to reset your Kawal Quest password.</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't ask to reset your password, you can ignore this email.</p>
<p>Thanks,</p>
<p>Your Kawal Quest team</p>`;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  const rawEmail = typeof body === "object" && body !== null && "email" in body ? (body as { email?: unknown }).email : null;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const now = Date.now();
  const cooldownUntil = nextAllowedAt.get(email) ?? 0;
  if (now < cooldownUntil) {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again.", retryAfterMs: cooldownUntil - now }, { status: 429 });
  }
  nextAllowedAt.set(email, now + RESET_COOLDOWN_MS);

  try {
    const origin = new URL(request.url).origin;
    const link = await getAdminAuth().generatePasswordResetLink(email, { url: `${origin}/reset-password` });
    await sendMail({ to: email, subject: "Reset your Kawal Quest password", html: resetEmailHtml(link) });
  } catch (err) {
    // Don't reveal whether the account exists.
    if (errorCode(err).includes("user-not-found")) return NextResponse.json({ success: true });
    console.error("Failed to send password reset email", err);
    return NextResponse.json({ error: "Unable to send the reset email right now. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
