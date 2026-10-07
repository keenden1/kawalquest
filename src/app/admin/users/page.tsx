import { redirect } from "next/navigation";
import RoleManager, { type ManagedUser } from "@/components/RoleManager";
import { getSessionUser, isAdminRole, normalizeRole } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export default async function UsersPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (!isAdminRole(sessionUser.role)) redirect("/account");
  const canManageSuperadmins = sessionUser.role === "superadmin";

  const result = await getAdminAuth().listUsers(100);
  const users: ManagedUser[] = result.users
    .filter(user => canManageSuperadmins || normalizeRole(user.customClaims?.role) !== "superadmin")
    .map((user) => ({ uid: user.uid, email: user.email ?? "No email", name: user.displayName ?? user.email?.split("@")[0] ?? "Unnamed player", role: normalizeRole(user.customClaims?.role), disabled: user.disabled }));

  return <div className="space-y-7">
    <header className="max-w-3xl">
      <p className="eyebrow">Account management</p>
      <h1 className="page-title mt-2">Access roles</h1>
      <p className="mt-4 text-base leading-7 text-stone-400">Assign trusted accounts to {canManageSuperadmins ? "player, tester, admin, or superadmin" : "player, tester, or admin"} access. Select a role and press Save; the change applies after the user signs in again.</p>
    </header>
    <div className="rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm leading-6 text-amber-100/70">
      <strong className="text-amber-200">Use least privilege.</strong> Use Player for regular accounts, Tester for in-game testing, and Admin for dashboard operators.
      {canManageSuperadmins && <> Reserve <code>superadmin</code> for people trusted to manage all accounts and restricted game settings.</>}
    </div>
    <RoleManager initialUsers={users} currentUid={sessionUser.uid} canManageSuperadmins={canManageSuperadmins} />
  </div>;
}
