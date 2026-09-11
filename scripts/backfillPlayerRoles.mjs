// One-time backfill: mirrors every existing Firebase Auth user's "role" custom claim into
// Firestore playerRoles/{uid}, for accounts that were given a role (tester/admin/superadmin)
// before the playerRoles mirror existed. Going forward, /api/admin/users/role and
// scripts/set-role.mjs both write this mirror automatically on every role change - this script
// only needs to run once to catch up accounts that predate that.
//
// Skips plain "user" accounts on purpose: AdminButtonGate already treats a missing
// playerRoles/{uid} doc as "not eligible" (same default a real "user" role would produce), so
// writing a doc for every regular player would just be wasted writes for no behavior change.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local.");
  process.exit(1);
}

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth(app);
const db = getFirestore(app);

function canUseCheatButton(role) {
  return role === "tester" || role === "admin" || role === "superadmin";
}

let nextPageToken;
let checked = 0;
let written = 0;

do {
  const page = await auth.listUsers(1000, nextPageToken);
  for (const user of page.users) {
    checked += 1;
    const role = user.customClaims?.role;
    if (role !== "tester" && role !== "admin" && role !== "superadmin") continue;

    await db.collection("playerRoles").doc(user.uid).set(
      { role, canUseCheatButton: canUseCheatButton(role) },
      { merge: true }
    );
    written += 1;
    console.log(`Mirrored ${user.email ?? user.uid} -> role: ${role}`);
  }
  nextPageToken = page.pageToken;
} while (nextPageToken);

console.log(`Done. Checked ${checked} account(s), mirrored ${written} with a non-default role.`);
