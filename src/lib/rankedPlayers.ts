import { getAdminDb } from "@/lib/firebaseAdmin";

// These document IDs belong to the 20 sample players in scripts/seed.mjs.
export function isSamplePlayer(id: string): boolean {
  return /^seed-(?:0[1-9]|1[0-9]|20)$/.test(id);
}

export type RankedPlayer = { id: string; username: string; points: number };

export async function getRankedPlayers(limit: number): Promise<RankedPlayer[]> {
  const players: RankedPlayer[] = [];
  const baseQuery = getAdminDb().collection("players").orderBy("points", "desc").limit(100);
  let query = baseQuery;
  while (players.length < limit) {
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      if (isSamplePlayer(doc.id)) continue;
      const data = doc.data();
      players.push({ id: doc.id, username: typeof data.username === "string" ? data.username : "Unknown Kawal", points: typeof data.points === "number" ? data.points : 0 });
      if (players.length === limit) break;
    }
    if (snapshot.docs.length < 100 || players.length === limit) break;
    query = baseQuery.startAfter(snapshot.docs[snapshot.docs.length - 1]);
  }
  return players;
}
