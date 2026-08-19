import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type PlayerRow = { uid: string; username: string; points: number; createdAt: string | null };

async function fetchPlayers(): Promise<{ players: PlayerRow[]; error: string | null }> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("players").orderBy("points", "desc").get();
    return {
      players: snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          username: typeof data.username === "string" ? data.username : "(no username)",
          points: typeof data.points === "number" ? data.points : 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        };
      }),
      error: null,
    };
  } catch (err) {
    return { players: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function PlayersPage() {
  const { players, error } = await fetchPlayers();
  const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
  const topScore = players[0]?.points ?? 0;

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="eyebrow">Player Intelligence</p>
        <h1 className="page-title mt-2">Realm leaderboard</h1>
        <p className="mt-4 text-base leading-7 text-stone-400">Live Firestore roster ranked by quest points. Inventory, gold, and level data are not synced yet.</p>
      </header>

      {!error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Adventurers", players.length.toLocaleString(), "Active roster"], ["Realm points", totalPoints.toLocaleString(), "Across all players"], ["Top score", topScore.toLocaleString(), players[0]?.username ?? "No champion yet"]].map(([label, value, note]) => (
            <div key={label} className="game-panel rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
              <p className="mt-1 truncate text-xs text-emerald-300/70">{note}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-200" role="alert">
          <p className="font-bold">Could not reach the player realm</p>
          <p className="mt-1 text-red-200/70">{error}</p>
          <p className="mt-3 text-red-200/60">Check that <code>.env.local</code> contains valid Firebase service account credentials.</p>
        </div>
      )}

      {!error && players.length === 0 && (
        <div className="game-panel rounded-2xl p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-2xl">♜</div>
          <h2 className="mt-4 font-bold text-white">The realm is quiet</h2>
          <p className="mt-1 text-sm text-stone-400">No players found in the <code className="text-stone-300">players</code> collection yet.</p>
        </div>
      )}

      {!error && players.length > 0 && (
        <section className="game-panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
            <div><h2 className="font-bold text-white">Adventurer rankings</h2><p className="mt-0.5 text-xs text-stone-500">Sorted by highest quest points</p></div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/15 text-stone-500"><tr>{["Rank", "Adventurer", "Quest points", "Player ID", "Joined"].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/6">
                {players.map((player, index) => (
                  <tr key={player.uid} className="transition-colors hover:bg-white/3">
                    <td className="px-5 py-4"><span className={`grid size-8 place-items-center rounded-lg text-xs font-extrabold ${index < 3 ? "bg-amber-300/12 text-amber-300" : "bg-white/4 text-stone-500"}`}>{index + 1}</span></td>
                    <td className="px-5 py-4 font-bold text-stone-100">{player.username}</td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-300">{player.points.toLocaleString()}</td>
                    <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-stone-600" title={player.uid}>{player.uid}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-stone-500">{player.createdAt ? new Date(player.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
