import { UNITY_BOSS_NAMES, UNITY_MOB_NAMES } from "@/lib/contentNames";
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
      aboutCredits: typeof data?.aboutCredits === "string" ? data.aboutCredits : "",
      showCheatButton: Boolean(data?.showCheatButton ?? false),
      apkDownloadUrl: typeof data?.apkDownloadUrl === "string" ? data.apkDownloadUrl : "",
      apkDownloadEnabled: Boolean(data?.apkDownloadEnabled ?? false),
      mobChaseDistances: Array.from({ length: 10 }, (_, index) => {
        const value = data?.[`mobChaseDistanceArc${index + 1}`];
        return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
      }),
      mobNames: UNITY_MOB_NAMES.map((fallback, index) => {
        const value = data?.[`mobNameArc${index + 1}`];
        return typeof value === "string" && value.trim() ? value : fallback;
      }),
      bossNames: Array.from({ length: 10 }, (_, index) => {
        const value = data?.[`bossNameArc${index + 1}`];
        return typeof value === "string" && value.trim() ? value : UNITY_BOSS_NAMES[index];
      }),
      boyCharacterName: typeof data?.boyCharacterName === "string" && data.boyCharacterName !== "Juan Mandirigma" ? data.boyCharacterName : "David",
      girlCharacterName: typeof data?.girlCharacterName === "string" && data.girlCharacterName !== "Issa Salamangkero" ? data.girlCharacterName : "Clarisa",
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
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: "Configuration must be an object." }, { status: 400 });
    const update: {
      aboutCredits?: string;
      showCheatButton?: boolean;
      apkDownloadUrl?: string;
      apkDownloadEnabled?: boolean;
      boyCharacterName?: string;
      girlCharacterName?: string;
      [key: `bossNameArc${number}`]: string | undefined;
      [key: `mobNameArc${number}`]: string | undefined;
      [key: `mobChaseDistanceArc${number}`]: number | null | undefined;
    } = {};

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

    if ("aboutCredits" in body) {
      if (typeof body.aboutCredits !== "string" || body.aboutCredits.length > 2000) {
        return NextResponse.json({ error: "Credits must be text of 2,000 characters or fewer." }, { status: 400 });
      }
      const credits = body.aboutCredits.replace(/\r\n?/g, "\n").trim();
      if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(credits)) {
        return NextResponse.json({ error: "Credits must be plain text without markup or control characters." }, { status: 400 });
      }
      update.aboutCredits = credits;
    }
    const nameFields = [
      { key: "boyCharacterName", label: "Boy character name", allowEmpty: false },
      { key: "girlCharacterName", label: "Girl character name", allowEmpty: false },
    ] as const;

    for (const field of nameFields) {
      if (!(field.key in body)) continue;
      const rawValue = body[field.key];
      if (typeof rawValue !== "string") {
        return NextResponse.json({ error: `${field.label} must be text.` }, { status: 400 });
      }
      const value = rawValue.trim();
      if (!field.allowEmpty && value.length < 2) {
        return NextResponse.json({ error: `${field.label} must be at least 2 characters.` }, { status: 400 });
      }
      if (value.length > 40) {
        return NextResponse.json({ error: `${field.label} must be 40 characters or fewer.` }, { status: 400 });
      }
      if (/[<>\u0000-\u001F\u007F]/u.test(value)) {
        return NextResponse.json({ error: `${field.label} contains unsupported characters.` }, { status: 400 });
      }
      update[field.key] = value;
    }

    let savedBossNames: string[] | undefined;
    if ("bossNames" in body) {
      if (!Array.isArray(body.bossNames) || body.bossNames.length !== 10) {
        return NextResponse.json({ error: "Boss names must contain one entry for every Arc 1–10." }, { status: 400 });
      }
      savedBossNames = [];
      for (let index = 0; index < 10; index++) {
        const rawValue = body.bossNames[index];
        if (typeof rawValue !== "string") {
          return NextResponse.json({ error: `Arc ${index + 1} boss name must be text.` }, { status: 400 });
        }
        const value = rawValue.trim();
        if (value.length < 2) {
          return NextResponse.json({ error: `Arc ${index + 1} boss name must be at least 2 characters.` }, { status: 400 });
        }
        if (value.length > 40) {
          return NextResponse.json({ error: `Arc ${index + 1} boss name must be 40 characters or fewer.` }, { status: 400 });
        }
        if (/[<>\u0000-\u001F\u007F]/u.test(value)) {
          return NextResponse.json({ error: `Arc ${index + 1} boss name contains unsupported characters.` }, { status: 400 });
        }
        update[`bossNameArc${index + 1}`] = value;
        savedBossNames.push(value);
      }
    }

    let savedMobNames: string[] | undefined;
    if ("mobNames" in body) {
      if (!Array.isArray(body.mobNames) || body.mobNames.length !== 10) {
        return NextResponse.json({ error: "Mob names must contain one entry for every Arc 1–10." }, { status: 400 });
      }
      savedMobNames = [];
      for (let index = 0; index < 10; index++) {
        const rawValue = body.mobNames[index];
        if (typeof rawValue !== "string") {
          return NextResponse.json({ error: `Arc ${index + 1} mob name must be text.` }, { status: 400 });
        }
        const value = rawValue.trim();
        if (value.length < 2) {
          return NextResponse.json({ error: `Arc ${index + 1} mob name must be at least 2 characters.` }, { status: 400 });
        }
        if (value.length > 40) {
          return NextResponse.json({ error: `Arc ${index + 1} mob name must be 40 characters or fewer.` }, { status: 400 });
        }
        if (/[<>\u0000-\u001F\u007F]/u.test(value)) {
          return NextResponse.json({ error: `Arc ${index + 1} mob name contains unsupported characters.` }, { status: 400 });
        }
        update[`mobNameArc${index + 1}`] = value;
        savedMobNames.push(value);
      }
    }

    let savedMobChaseDistances: (number | null)[] | undefined;
    if ("mobChaseDistances" in body) {
      if (!Array.isArray(body.mobChaseDistances) || body.mobChaseDistances.length !== 10) {
        return NextResponse.json({ error: "Chase distances must contain one entry for every Arc 1-10." }, { status: 400 });
      }
      savedMobChaseDistances = [];
      for (let index = 0; index < 10; index++) {
        const value = body.mobChaseDistances[index];
        if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) {
          return NextResponse.json({ error: `Arc ${index + 1} chase distance must be 0-100 metres, or blank to use the game setting.` }, { status: 400 });
        }
        update[`mobChaseDistanceArc${index + 1}`] = value;
        savedMobChaseDistances.push(value);
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const db = getAdminDb();
    await db
      .collection(CONFIG_DOC_PATH[0])
      .doc(CONFIG_DOC_PATH[1])
      .set(update, { merge: true });

    return NextResponse.json({ ...update, bossNames: savedBossNames, mobNames: savedMobNames, mobChaseDistances: savedMobChaseDistances });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
