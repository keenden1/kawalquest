import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getSessionUser, isAdminRole } from "@/lib/auth";

// Single doc holding all remote flags the game reads. Kept as one doc (not one
// per flag) so adding more flags later doesn't require new collections/routes.
const CONFIG_DOC_PATH = ["adminConfig", "flags"] as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  try {
    const db = getAdminDb();
    const snap = await db.collection(CONFIG_DOC_PATH[0]).doc(CONFIG_DOC_PATH[1]).get();
    const data = snap.exists ? snap.data() : {};
    return NextResponse.json({
      showCheatButton: Boolean(data?.showCheatButton ?? false),
      apkDownloadUrl: typeof data?.apkDownloadUrl === "string" ? data.apkDownloadUrl : "",
      apkDownloadEnabled: Boolean(data?.apkDownloadEnabled ?? false),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  try {
    const body = await request.json();
    const update: { showCheatButton?: boolean; apkDownloadUrl?: string; apkDownloadEnabled?: boolean } = {};

    if ("showCheatButton" in body) {
      if (typeof body.showCheatButton !== "boolean") {
        return NextResponse.json(
          { error: "showCheatButton must be a boolean" },
          { status: 400 }
        );
      }
      update.showCheatButton = body.showCheatButton;
    }

    if ("apkDownloadEnabled" in body) {
      if (typeof body.apkDownloadEnabled !== "boolean") {
        return NextResponse.json(
          { error: "apkDownloadEnabled must be a boolean" },
          { status: 400 }
        );
      }
      update.apkDownloadEnabled = body.apkDownloadEnabled;
    }

    if ("apkDownloadUrl" in body) {
      if (typeof body.apkDownloadUrl !== "string") {
        return NextResponse.json(
          { error: "apkDownloadUrl must be a string" },
          { status: 400 }
        );
      }
      const trimmed = body.apkDownloadUrl.trim();
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        return NextResponse.json(
          { error: "apkDownloadUrl must start with http:// or https://" },
          { status: 400 }
        );
      }
      update.apkDownloadUrl = trimmed;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const db = getAdminDb();
    await db
      .collection(CONFIG_DOC_PATH[0])
      .doc(CONFIG_DOC_PATH[1])
      .set(update, { merge: true });

    return NextResponse.json(update);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
