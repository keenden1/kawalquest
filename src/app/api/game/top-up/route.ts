import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { XSOLLA_TOPUP_PACKAGES, getXsollaPackage } from "@/lib/xsolla";
import { createXsollaToken, isXsollaConfigured } from "@/lib/xsollaServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function settings() {
  const projectId = Number(process.env.XSOLLA_PROJECT_ID);
  return {
    configured: isXsollaConfigured() && Boolean(process.env.XSOLLA_WEBHOOK_SECRET)
      && Number.isSafeInteger(projectId) && projectId > 0 && projectId <= 2147483647,
    projectId: Number.isSafeInteger(projectId) && projectId > 0 && projectId <= 2147483647 ? projectId : 0,
    sandbox: process.env.XSOLLA_SANDBOX !== "false",
  };
}

// The game and website use the same server-owned package catalog.
export async function GET() {
  return NextResponse.json({ ...settings(), packages: XSOLLA_TOPUP_PACKAGES }, { headers });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > 16384) {
    return NextResponse.json({ error: "Sign in to the game to buy Gold." }, { status: 401, headers });
  }

  // Never accept a UID, email, Gold amount, price, or redirect URL from the game.
  let user;
  try {
    user = await getAdminAuth().verifyIdToken(match[1], true);
  } catch {
    return NextResponse.json({ error: "Your game session expired. Please sign in again." }, { status: 401, headers });
  }

  const config = settings();
  if (!config.configured) {
    return NextResponse.json({ error: "Gold purchases are not available yet." }, { status: 503, headers });
  }

  const body: unknown = await request.json().catch(() => null);
  const packageId = typeof body === "object" && body !== null && "packageId" in body ? body.packageId : null;
  const selected = getXsollaPackage(packageId);
  if (!selected) return NextResponse.json({ error: "Choose a valid Gold package." }, { status: 400, headers });

  try {
    const player = await getAdminDb().collection("players").doc(user.uid).get();
    if (!player.exists) {
      return NextResponse.json({ error: "Start a character in the game before buying Gold." }, { status: 403, headers });
    }
    const { token } = await createXsollaToken({
      uid: user.uid,
      email: typeof user.email === "string" ? user.email : "",
      sku: selected.id,
      returnUrl: "https://www.kawalquest.online/game/top-up-return",
    });
    // Closing the payment UI never grants Gold. Only the signed Xsolla webhook does.
    return NextResponse.json({ token, projectId: config.projectId, sandbox: config.sandbox }, { headers });
  } catch {
    // Provider errors can contain payment details; do not echo or log their raw payload.
    console.error("game top-up: unable to prepare checkout");
    return NextResponse.json({ error: "Unable to start checkout. Please try again shortly." }, { status: 502, headers });
  }
}
