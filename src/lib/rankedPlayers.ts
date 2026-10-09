import { getAdminDb } from "@/lib/firebaseAdmin";

// These document IDs belong to the 20 sample players in scripts/seed.mjs.
export function isSamplePlayer(id: string): boolean {
  return /^seed-(?:0[1-9]|1[0-9]|20)$/.test(id);
}

export type RankedPlayer = { id: string; username: string; points: number };

export async function getRankedPlayers(limit: number, mode: "adventure" | "survival" = "adventure"): Promise<RankedPlayer[]> {
  const players: RankedPlayer[] = [];
  const scoreField = mode === "survival" ? "survivalBestKills" : "points";
  const baseQuery = getAdminDb().collection("players").orderBy(scoreField, "desc").limit(100);
  let query = baseQuery;
  while (players.length < limit) {
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      if (isSamplePlayer(doc.id)) continue;
      const data = doc.data();
      const score = typeof data[scoreField] === "number" ? data[scoreField] : 0;
      if (mode === "survival" && score <= 0) continue;
      players.push({ id: doc.id, username: typeof data.username === "string" ? data.username : "Unknown Kawal", points: score });
      if (players.length === limit) break;
    }
    if (snapshot.docs.length < 100 || players.length === limit) break;
    query = baseQuery.startAfter(snapshot.docs[snapshot.docs.length - 1]);
  }
  return players;
}
