import { NextResponse } from "next/server";
import { getSessionUser, normalizeRole, ROLES } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (sessionUser.role !== "superadmin") return NextResponse.json({ error: "Superadmin role required." }, { status: 403 });

  try {
    const body: unknown = await request.json();
    const uid = typeof body === "object" && body !== null && "uid" in body ? (body as { uid?: unknown }).uid : null;
    const requestedRole = typeof body === "object" && body !== null && "role" in body ? (body as { role?: unknown }).role : null;
    if (typeof uid !== "string" || !uid || !ROLES.includes(requestedRole as (typeof ROLES)[number])) {
      return NextResponse.json({ error: "A valid user and role are required." }, { status: 400 });
    }
    if (uid === sessionUser.uid) return NextResponse.json({ error: "You cannot change your own role from this screen." }, { status: 400 });

    const auth = getAdminAuth();
    const target = await auth.getUser(uid);
    const role = normalizeRole(requestedRole);
    await auth.setCustomUserClaims(uid, { ...target.customClaims, role });
    return NextResponse.json({ uid, role });
  } catch {
    return NextResponse.json({ error: "Unable to update this user's role." }, { status: 500 });
  }
}
