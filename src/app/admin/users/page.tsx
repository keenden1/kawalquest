import { redirect } from "next/navigation";
import RoleManager, { type ManagedUser } from "@/components/RoleManager";
import { getSessionUser, normalizeRole } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export default async function UsersPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "superadmin") redirect("/admin");

  const result = await getAdminAuth().listUsers(100);
  const users: ManagedUser[] = result.users.map((user) => ({ uid: user.uid, email: user.email ?? "No email", name: user.displayName ?? user.email?.split("@")[0] ?? "Unnamed player", role: normalizeRole(user.customClaims?.role), disabled: user.disabled }));

  return <div className="space-y-7"><header className="max-w-3xl"><p className="eyebrow">Superadmin Control</p><h1 className="page-title mt-2">Access roles</h1><p className="mt-4 text-base leading-7 text-stone-400">Assign trusted Firebase users to player, admin, or superadmin access. Role changes apply after the user signs in again.</p></header><div className="rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm leading-6 text-amber-100/70"><strong className="text-amber-200">Use least privilege.</strong> Players should remain <code>user</code>; assign <code>admin</code> only for dashboard operators and <code>superadmin</code> only for people allowed to manage roles.</div><RoleManager initialUsers={users} currentUid={sessionUser.uid} /></div>;
}
