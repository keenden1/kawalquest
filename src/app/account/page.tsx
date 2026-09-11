import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const playerRef = getAdminDb().collection("players").doc(user.uid);
  const profileSnapshot = await playerRef.get();
  const profile = profileSnapshot.data();
  const username = typeof profile?.username === "string" ? profile.username : user.name ?? "Kawal";
  const points = typeof profile?.points === "number" ? profile.points : 0;
  const joinedAt = profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString(undefined, { dateStyle: "long" }) : "Recently joined";

  return (
    <main className="min-h-screen pb-8">
      <PublicHeader active="/account" user={user} />
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <section className="game-panel mt-16 overflow-hidden rounded-3xl">
          <div className="flex flex-col gap-5 border-b border-white/7 bg-gradient-to-r from-emerald-400/10 to-transparent p-7 sm:flex-row sm:items-end sm:justify-between sm:p-10"><div><p className="eyebrow">Player account</p><h1 className="mt-3 text-4xl font-black tracking-tight text-white">Welcome, {username}.</h1><p className="mt-3 text-stone-400">Guardian since {joinedAt}</p></div><Link href="/account/top-up" className="rounded-xl bg-amber-300 px-5 py-3 text-center text-sm font-black text-[#172018] hover:bg-amber-200">Top up Gold →</Link></div>
          <div className="grid gap-px bg-white/7 sm:grid-cols-3">
            <div className="bg-[#0a1711] p-6"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Quest points</p><p className="mt-2 text-xl font-black text-emerald-300">{points.toLocaleString()} XP</p></div>
            <div className="bg-[#0a1711] p-6"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Role</p><p className="mt-2 font-bold capitalize text-stone-300">{user.role}</p></div>
            <div className="bg-[#0a1711] p-6"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Email</p><p className="mt-2 truncate text-sm font-bold text-stone-300" title={user.email ?? undefined}>{user.email ?? "Unavailable"}</p></div>
          </div>
        </section>
        {isAdminRole(user.role) && <div className="mt-5 flex items-center justify-between rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5"><div><p className="font-bold text-amber-100">Administrative access detected</p><p className="mt-1 text-sm text-amber-100/60">Your role can enter the command center.</p></div><Link href="/admin" className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-[#172018]">Open admin →</Link></div>}
      </div>
    </main>
  );
}
