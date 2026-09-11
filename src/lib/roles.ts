// Pure role constants/helpers with no server-only dependencies, split out of auth.ts so
// client components (e.g. RoleManager.tsx) can import ROLES/Role without pulling in auth.ts's
// "server-only" guard (which poisons the whole module for any client bundle that imports a
// runtime value from it, not just the specific export used) - same split rationale as
// xsolla.ts/xsollaServer.ts elsewhere in this project.
export const ROLES = ["user", "tester", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export function normalizeRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "user";
}

export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "superadmin";
}

// Tester is a playtesting-only tier: it does NOT grant web admin dashboard access
// (isAdminRole above stays admin/superadmin-only) - it only grants visibility of the
// in-game Cheat button, gated separately via the playerRoles/{uid} Firestore mirror
// written whenever a role changes (see /api/admin/users/role and scripts/set-role.mjs).
export function canUseCheatButton(role: Role): boolean {
  return role === "tester" || isAdminRole(role);
}
