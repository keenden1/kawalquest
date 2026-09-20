// Populate only missing/blank About descriptions; retain all authored content.
// Run without --apply to inspect, then with --apply to initialize the descriptions.
import { readFileSync } from "node:fs";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const defaults = JSON.parse(readFileSync(new URL("../src/lib/aboutDefaults.json", import.meta.url), "utf8"));
const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}) });
try {
  const db = getFirestore(app);
  const ref = db.collection("adminConfig").doc("flags");
  if (!process.argv.includes("--apply")) {
    const snapshot = await ref.get();
    const data = snapshot.data() ?? {};
    for (const key of Object.keys(defaults))
      console.log(`${key}: ${typeof data[key] === "string" && data[key].trim() ? "saved text exists; preserve" : "no custom text; ready to initialize"}`);
  } else {
    const initialized = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data() ?? {};
      const update = {};
      for (const [key, value] of Object.entries(defaults))
        if (data[key] == null || (typeof data[key] === "string" && !data[key].trim())) update[key] = value;
      if (Object.keys(update).length) transaction.set(ref, update, {merge:true});
      return Object.keys(update);
    });
    console.log("Initialized: " + (initialized.join(", ") || "none; existing text preserved"));
    const saved = (await ref.get()).data() ?? {};
    for (const key of Object.keys(defaults)) {
      if (typeof saved[key] !== "string" || !saved[key].trim()) throw new Error(`${key} is not populated.`);
      console.log(`${key}: verified saved (${saved[key].length} characters)`);
    }
  }
} finally {
  await deleteApp(app);
}
