import PlayersTable, { type PlayerRow } from "@/components/PlayersTable";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

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

      {!error && players.length > 0 && <PlayersTable players={players} />}
    </div>
  );
}
