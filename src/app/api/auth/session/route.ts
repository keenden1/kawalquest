import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { decodedTokenToUser, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return new URL(origin).host === new URL(request.url).host;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body: unknown = await request.json();
    const idToken = typeof body === "object" && body !== null && "idToken" in body ? (body as { idToken?: unknown }).idToken : null;
    if (typeof idToken !== "string" || idToken.length < 100) return NextResponse.json({ error: "A valid sign-in token is required." }, { status: 400 });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return NextResponse.json({ error: "Please sign in again before creating a session." }, { status: 401 });

    const profileRef = getAdminDb().collection("players").doc(decoded.uid);
    await getAdminDb().runTransaction(async (transaction) => {
      const profile = await transaction.get(profileRef);
      const rawUsername = decoded.name ?? decoded.email?.split("@")[0] ?? "New Kawal";
      const identity = { username: rawUsername.slice(0, 10), email: decoded.email ?? null, lastLoginAt: FieldValue.serverTimestamp() };
      if (profile.exists) transaction.set(profileRef, identity, { merge: true });
      else transaction.set(profileRef, { ...identity, points: 0, mockGold: 0, createdAt: FieldValue.serverTimestamp() });
    });

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    const response = NextResponse.json({ user: decodedTokenToUser(decoded) });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS, priority: "high" });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to create a secure session." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
