// Seeds sample data into the `players` Firestore collection so the leaderboard/admin
// dashboard has something realistic to show and test sorting/limits against.
// Run with: npm run seed
// Requires .env.local to be filled in (see .env.local.example).
//
// Idempotent: uses fixed doc IDs and wipes the collection before reseeding, so running
// this repeatedly updates the same 20 sample players instead of piling up duplicates.
// This is only safe because this is a test project with no real player data in it yet
// (see CLAUDE.md) -- do not point this at a production project.

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing Firebase Admin credentials. Fill in .env.local first (see .env.local.example), " +
        "then run this with: node --env-file=.env.local scripts/seed.mjs"
    );
    process.exit(1);
  }

  return { projectId, clientEmail, privateKey };
}

// 20 entries with a wide, slightly uneven point spread (including a tie) so the
// leaderboard has something realistic to sort/paginate/limit against.
const samplePlayers = [
  { id: "seed-01", username: "JuanMandirigma", points: 3120 },
  { id: "seed-02", username: "IssaSalamangkero", points: 2875 },
  { id: "seed-03", username: "LapuLapuFan88", points: 2540 },
  { id: "seed-04", username: "Katipunero_23", points: 2310 },
  { id: "seed-05", username: "BonifacioBlade", points: 1980 },
  { id: "seed-06", username: "BaybayinBoy", points: 1875 },
  { id: "seed-07", username: "SampaguitaSlash", points: 1650 },
  { id: "seed-08", username: "TalaWarrior", points: 1650 },
  { id: "seed-09", username: "MaharlikaMage", points: 1420 },
  { id: "seed-10", username: "DiwataDancer", points: 1290 },
  { id: "seed-11", username: "BantayBayan", points: 1105 },
  { id: "seed-12", username: "AswangHunter", points: 940 },
  { id: "seed-13", username: "KalasagKid", points: 810 },
  { id: "seed-14", username: "ItakIsabel", points: 675 },
  { id: "seed-15", username: "PandayPete", points: 540 },
  { id: "seed-16", username: "BarangayHero", points: 410 },
  { id: "seed-17", username: "RizalReader", points: 300 },
  { id: "seed-18", username: "GabrielaGrit", points: 180 },
  { id: "seed-19", username: "TutorialTess", points: 60 },
  { id: "seed-20", username: "NewRecruit99", points: 5 },
];

async function main() {
  const app = initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore(app);
  const players = db.collection("players");

  const existing = await players.get();
  if (!existing.empty) {
    const deleteBatch = db.batch();
    existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log(`Cleared ${existing.size} existing document(s) from "players".`);
  }

  const insertBatch = db.batch();
  for (const player of samplePlayers) {
    insertBatch.set(players.doc(player.id), {
      username: player.username,
      points: player.points,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await insertBatch.commit();

  console.log(`Seeded ${samplePlayers.length} sample players into the "players" collection.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
