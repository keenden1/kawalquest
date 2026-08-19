import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

async function getPlayers() {
  try {
    const snapshot = await getAdminDb().collection("players").orderBy("points", "desc").limit(25).get();
    return snapshot.docs.map((doc) => { const data = doc.data(); return { id: doc.id, username: typeof data.username === "string" ? data.username : "Unknown Kawal", points: typeof data.points === "number" ? data.points : 0 }; });
  } catch { return []; }
}

export default async function LeaderboardPage() {
  const players = await getPlayers();
  return <main className="min-h-screen bg-[#050b08]"><PublicHeader active="/leaderboard" /><section className="mx-auto max-w-4xl px-5 py-20 sm:px-8 lg:py-28"><p className="eyebrow">Hall of Kawal</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">Realm leaderboard.</h1><p className="mt-5 text-lg text-stone-400">The guardians with the greatest quest experience.</p><div className="game-panel mt-12 overflow-hidden rounded-3xl">{players.length ? <ol className="divide-y divide-white/7">{players.map((player, index) => <li key={player.id} className="flex items-center gap-5 px-6 py-5"><span className={`grid size-10 place-items-center rounded-xl text-sm font-black ${index < 3 ? "bg-amber-300/12 text-amber-300" : "bg-white/5 text-stone-500"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold text-white">{player.username}</span><span className="font-mono font-bold text-emerald-300">{player.points.toLocaleString()} XP</span></li>)}</ol> : <p className="px-6 py-16 text-center text-stone-500">No guardians have entered the rankings yet.</p>}</div></section></main>;
}
