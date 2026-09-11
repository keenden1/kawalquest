import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { normalizeRole, type Role } from "@/lib/roles";

export { ROLES, isAdminRole, canUseCheatButton, normalizeRole, type Role } from "@/lib/roles";

export const SESSION_COOKIE_NAME = "kawal_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export type SessionUser = {
  uid: string;
  email: string | null;
  name: string | null;
  role: Role;
};

export function decodedTokenToUser(token: DecodedIdToken): SessionUser {
  return {
    uid: token.uid,
    email: typeof token.email === "string" ? token.email : null,
    name: typeof token.name === "string" ? token.name : null,
    role: normalizeRole(token.role),
  };
}

export async function getSessionUser(checkRevoked = true): Promise<SessionUser | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const token = await getAdminAuth().verifySessionCookie(sessionCookie, checkRevoked);
    return decodedTokenToUser(token);
  } catch {
    return null;
  }
}
