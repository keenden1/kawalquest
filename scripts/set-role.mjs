import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [, , identifier, role] = process.argv;
const allowedRoles = new Set(["user", "tester", "admin", "superadmin"]);
if (!identifier || !allowedRoles.has(role)) {
  console.error("Usage: npm run set-role -- <uid-or-email> <user|tester|admin|superadmin>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local.");
  process.exit(1);
}

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth(app);
const user = identifier.includes("@") ? await auth.getUserByEmail(identifier) : await auth.getUser(identifier);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });

// Mirror into Firestore so the game (which can't read Auth custom claims client-side) can
// gate the in-game Cheat button by role - same write the /api/admin/users/role route does.
const canUseCheatButton = role === "tester" || role === "admin" || role === "superadmin";
await getFirestore(app).collection("playerRoles").doc(user.uid).set(
  { role, canUseCheatButton },
  { merge: true }
);

console.log(`Updated ${user.email ?? user.uid} to role: ${role}. The user must sign in again.`);
