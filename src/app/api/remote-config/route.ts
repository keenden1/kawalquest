import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Single doc holding all remote flags the game reads. Kept as one doc (not one
// per flag) so adding more flags later doesn't require new collections/routes.
const CONFIG_DOC_PATH = ["adminConfig", "flags"] as const;

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection(CONFIG_DOC_PATH[0]).doc(CONFIG_DOC_PATH[1]).get();
    const data = snap.exists ? snap.data() : {};
    return NextResponse.json({
      showCheatButton: Boolean(data?.showCheatButton ?? false),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.showCheatButton !== "boolean") {
      return NextResponse.json(
        { error: "showCheatButton must be a boolean" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db
      .collection(CONFIG_DOC_PATH[0])
      .doc(CONFIG_DOC_PATH[1])
      .set({ showCheatButton: body.showCheatButton }, { merge: true });

    return NextResponse.json({ showCheatButton: body.showCheatButton });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
