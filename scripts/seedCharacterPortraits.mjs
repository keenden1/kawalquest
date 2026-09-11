// One-time upload of the boy/girl full-body character portraits (the same art Unity's
// Character Panel uses for charactersprites[0]/[1]) to Firebase Storage, so the web
// /inventory page can show the player's actual character instead of nothing.
//
// Run with: npm run seed:portraits
// Requires .env.local to be filled in (see .env.local.example).
//
// Prints the two resulting URLs -- paste them into .env.local as
// CHARACTER_PORTRAIT_BOY_URL / CHARACTER_PORTRAIT_GIRL_URL (see .env.local.example).
// Re-running overwrites the same Storage paths, so it's safe to run again if the source
// art ever changes in Unity.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing Firebase Admin credentials. Fill in .env.local first (see .env.local.example), " +
        "then run this with: node --env-file=.env.local scripts/seedCharacterPortraits.mjs"
    );
    process.exit(1);
  }

  return { projectId, clientEmail, privateKey };
}

// Same sibling-project relative path used by scripts/seedShopItems.mjs.
const UNITY_SPRITE_DIR = "../../Kawal Quest/Assets/Resources/Sprite";

const portraits = [
  { key: "boy", localFile: "boy img.png", storagePath: "characters/boy.png" },
  { key: "girl", localFile: "girl img.png", storagePath: "characters/girl.png" },
];

async function main() {
  const serviceAccount = loadServiceAccount();
  const app = initializeApp({ credential: cert(serviceAccount) });
  const bucket = getStorage(app).bucket(`${serviceAccount.projectId}.firebasestorage.app`);

  const urls = {};
  for (const portrait of portraits) {
    console.log(`Uploading ${portrait.localFile}...`);
    const buffer = readFileSync(new URL(`${UNITY_SPRITE_DIR}/${portrait.localFile}`, import.meta.url));
    const token = randomUUID();
    const file = bucket.file(portrait.storagePath);
    await file.save(buffer, { contentType: "image/png", metadata: { metadata: { firebaseStorageDownloadTokens: token } } });
    urls[portrait.key] = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(portrait.storagePath)}?alt=media&token=${token}`;
  }

  console.log("\nDone. Add these to .env.local:\n");
  console.log(`CHARACTER_PORTRAIT_BOY_URL=${urls.boy}`);
  console.log(`CHARACTER_PORTRAIT_GIRL_URL=${urls.girl}`);
}

main().catch((err) => {
  console.error("seedCharacterPortraits failed:", err);
  process.exit(1);
});
