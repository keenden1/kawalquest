import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type PlayerRow = {
  uid: string;
  username: string;
  points: number;
  createdAt: string | null;
};

async function fetchPlayers(): Promise<{ players: PlayerRow[]; error: string | null }> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("players").orderBy("points", "desc").get();

    const players: PlayerRow[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : null;
      return {
        uid: doc.id,
        username: typeof data.username === "string" ? data.username : "(no username)",
        points: typeof data.points === "number" ? data.points : 0,
        createdAt,
      };
    });

    return { players, error: null };
  } catch (err) {
    return { players: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function PlayersPage() {
  const { players, error } = await fetchPlayers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="mt-1 text-slate-400">
          Sorted by points, descending. Only <code className="text-slate-300">username</code>,{" "}
          <code className="text-slate-300">points</code>, and{" "}
          <code className="text-slate-300">createdAt</code> exist in Firestore today &mdash;
          inventory/gold/level aren&apos;t synced to the cloud yet.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          Failed to load players: {error}
          <div className="mt-1 text-red-400">
            Make sure <code>.env.local</code> is filled in with your Firebase service
            account credentials.
          </div>
        </div>
      )}

      {!error && players.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          No players found in the <code>players</code> collection yet.
        </div>
      )}

      {!error && players.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">UID</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {players.map((player, index) => (
                <tr key={player.uid} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-100">{player.username}</td>
                  <td className="px-4 py-3 text-slate-100">{player.points}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{player.uid}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {player.createdAt ? new Date(player.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
