import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole, normalizeRole, canUseCheatButton, ROLES } from "@/lib/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(sessionUser.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  try {
    const body: unknown = await request.json();
    const uid = typeof body === "object" && body !== null && "uid" in body ? (body as { uid?: unknown }).uid : null;
    const requestedRole = typeof body === "object" && body !== null && "role" in body ? (body as { role?: unknown }).role : null;
    if (typeof uid !== "string" || !uid || !ROLES.includes(requestedRole as (typeof ROLES)[number])) {
      return NextResponse.json({ error: "A valid user and role are required." }, { status: 400 });
    }
    if (uid === sessionUser.uid) return NextResponse.json({ error: "You cannot change your own role from this screen." }, { status: 400 });
    if (sessionUser.role !== "superadmin" && requestedRole === "superadmin") {
      return NextResponse.json({ error: "Superadmin role required to assign this role." }, { status: 403 });
    }

    const auth = getAdminAuth();
    const target = await auth.getUser(uid);
    if (sessionUser.role !== "superadmin" && normalizeRole(target.customClaims?.role) === "superadmin") {
      return NextResponse.json({ error: "You cannot manage this account." }, { status: 403 });
    }
    const role = normalizeRole(requestedRole);
    await auth.setCustomUserClaims(uid, { ...target.customClaims, role });

    // Mirror into Firestore so the game (which can't read Auth custom claims client-side
    // without decoding the ID token) can gate the in-game Cheat button by role. Kept in a
    // dedicated collection rather than a field on players/{uid} - that doc's write rule lets
    // the player themselves write their own doc, which would let a client just set its own
    // role field directly; playerRoles/{uid} is read-only to the client (see Firestore rules).
    await getAdminDb().collection("playerRoles").doc(uid).set(
      { role, canUseCheatButton: canUseCheatButton(role) },
      { merge: true }
    );

    return NextResponse.json({ uid, role });
  } catch {
    return NextResponse.json({ error: "Unable to update this user's role." }, { status: 500 });
  }
}
