// One-time import of the Kawal Quest Unity project's existing hand-authored shop items
// (boy weapons/gear + girl Book-type weapons) into the web dashboard's `shopItems`
// Firestore collection, so they show up on /shop and /admin/shop the same way any
// web-added item does. Uploads each item's icon (read from the sibling Unity project's
// Assets/Resources/Sprite/ folder) to Firebase Storage first.
//
// Run with: npm run seed:shop
// Requires .env.local to be filled in (see .env.local.example).
//
// Idempotent: fixed doc IDs (unity-*) and re-uploads/overwrites the same Storage paths on
// every run, so re-running updates these items in place instead of duplicating them.
// Does NOT touch any other shopItems documents (admin-created ones are left alone).

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing Firebase Admin credentials. Fill in .env.local first (see .env.local.example), " +
        "then run this with: node --env-file=.env.local scripts/seedShopItems.mjs"
    );
    process.exit(1);
  }

  return { projectId, clientEmail, privateKey };
}

// Path from this script (kawal-quest-admin/scripts/) to the sibling Unity project's local
// sprite folder -- both projects live side by side under the same parent directory.
const UNITY_SPRITE_DIR = "../../Kawal Quest/Assets/Resources/Sprite";

// Field values copied verbatim from each item's .asset file in the Unity project (see
// CLAUDE.md's "Web-synced Shop catalog" section for the source paths). weaponType/gearType
// are converted from Unity's numeric enum (0/1/2) to the matching string the web schema uses.
const items = [
  {
    id: "unity-divine-sword",
    name: "DIVINE SWORD",
    category: "Weapon",
    price: 2000,
    rarity: 5,
    descriptionEN: "A sacred blade blessed by the gods, shining with holy power that smites evil and protects the righteous.",
    descriptionTL: "Isang banal na espada na pinagpala ng mga diyos, nagliliwanag sa sagradong lakas na sumisira sa kasamaan at nagtatanggol sa mga matuwid.",
    order: 10,
    active: true,
    damage: 200,
    critRate: 0.6,
    critDamage: 0.8,
    weaponType: "Sword",
    range: 0,
    spriteFile: "ChatGPT Image Dec 15, 2025, 09_01_55 PM.png",
  },
  {
    id: "unity-eye-of-eternity-ring",
    name: "EYE OF ETERNITY RING",
    category: "Gear",
    price: 2000,
    rarity: 5,
    descriptionEN: "A mystical ring with an all-seeing eye, granting its bearer insight beyond time itself.",
    descriptionTL: "Isang mahiwagang singsing na may matang nakakakita ng lahat, nagbibigay sa nagsusuot ng kaalamang lampas sa mismong panahon.",
    order: 20,
    active: true,
    damage: 500,
    critRate: 0.4,
    critDamage: 0.7,
    gearType: "Ring",
    defense: 0,
    health: 0,
    moveSpeed: 0,
    spriteFile: "—Pngtree—jewelry gem ring game props_5915621.png",
  },
  {
    id: "unity-ancestor-pendants",
    name: "ANCESTOR PENDANTS",
    category: "Gear",
    price: 2000,
    rarity: 5,
    descriptionEN: "A talisman passed down from ancient warriors, imbued with the power of different elements that protect its bearer.",
    descriptionTL: "Anting Anting na pamana mismo ng mga sinaunang mandirig ma, may hawak na kapangyarihan ng ibat ibang elemento na nag p-protekta mismo sa mandirigma",
    order: 30,
    active: true,
    damage: 0,
    critRate: 0,
    critDamage: 0,
    gearType: "Pendant",
    defense: 150,
    health: 800,
    moveSpeed: 0,
    spriteFile: "—Pngtree—tribal beaded necklace with abstract_22517986.png",
  },
  {
    id: "unity-double-pistol",
    name: "Double pistol",
    category: "Weapon",
    price: 1900,
    rarity: 5,
    descriptionEN: "",
    descriptionTL: "",
    order: 40,
    active: true,
    damage: 100,
    critRate: 0,
    critDamage: 0,
    weaponType: "Sword", // as authored in Unity (ruger.asset) -- no sprite was ever assigned either
    range: 0,
    spriteFile: null,
  },
  {
    id: "unity-double-pistol-red",
    name: "Double pistol red",
    category: "Weapon",
    price: 1900,
    rarity: 5,
    descriptionEN: "",
    descriptionTL: "",
    order: 50,
    active: true,
    damage: 100,
    critRate: 0,
    critDamage: 0,
    weaponType: "Sword", // as authored in Unity (ruger red.asset) -- no sprite was ever assigned either
    range: 0,
    spriteFile: null,
  },
  // Girl-character weapons (Assets/Scripts/SO/Assets/Weapons/Girl Weapon/) -- weaponType
  // "Book" is what InventoryScript.cs's equip check treats as girl-only (Cannot Equip for
  // Boy), mirroring how "Sword" above is boy-only.
  {
    id: "unity-basic-book",
    name: "Basic Book",
    category: "Weapon",
    price: 200,
    rarity: 3,
    descriptionEN: "Wielded by beginner mages to safeguard their homeland.",
    descriptionTL: "Gamit ng mga nag uumpisang salamangkero upang protektahan ang mga kababayan.",
    order: 60,
    active: true,
    damage: 20,
    critRate: 0.02,
    critDamage: 0.01,
    weaponType: "Book",
    range: 0,
    spriteFile: "toppng.com-book-6095x5031.png",
  },
  {
    id: "unity-basic-blue-book",
    name: "Basic blue book",
    category: "Weapon",
    price: 100,
    rarity: 3,
    descriptionEN: "Wielded by beginner mages to safeguard their homeland.",
    descriptionTL: "Gamit ng mga nag uumpisang salamangkero upang protektahan ang mga kababayan.",
    order: 70,
    active: true,
    damage: 20,
    critRate: 0.02,
    critDamage: 0.01,
    weaponType: "Book",
    range: 0,
    spriteFile: "ChatGPT Image Jan 8, 2026, 06_22_06 PM.png",
  },
  {
    id: "unity-basic-red-book",
    name: "Basic red book",
    category: "Weapon",
    price: 100,
    rarity: 3,
    descriptionEN: "Wielded by beginner mages to safeguard their homeland.",
    descriptionTL: "Gamit ng mga nag uumpisang salamangkero upang protektahan ang mga kababayan.",
    order: 80,
    active: true,
    damage: 20,
    critRate: 0.02,
    critDamage: 0.01,
    weaponType: "Book",
    range: 0,
    spriteFile: "ChatGPT Image Jan 8, 2026, 06_19_21 PM.png",
  },
  {
    id: "unity-paladin-book",
    name: "Paladin book",
    category: "Weapon",
    price: 2000,
    rarity: 5,
    descriptionEN: "Wielded by ancient mages, so powerful that a single incantation can drive away evil forces.",
    descriptionTL: "Ginagamit ng mga sinaunang salamangkero, makapangyarihan at isang bigkas ng spell lang ay natatakwil na ang mga masasamang elemento",
    order: 90,
    active: true,
    damage: 200,
    critRate: 0.8,
    critDamage: 0.1,
    weaponType: "Book",
    range: 0,
    spriteFile: "ChatGPT Image Jan 8, 2026, 06_27_12 PM.png",
  },
  {
    id: "unity-obsidian-warrior-necklace",
    name: "OBSIDIAN WARRIOR NECKLACE",
    category: "Gear",
    price: 400,
    rarity: 4,
    descriptionEN: "A rugged obsidian necklace that strengthens its wearer, boosting courage and resilience in battle.",
    descriptionTL: "Isang matibay na kuwintas na gawa sa obsidian na nagpapalakas ng tapang at tibay ng nagsusuot sa laban.",
    order: 100,
    active: true,
    damage: 0,
    critRate: 0,
    critDamage: 0,
    gearType: "Pendant",
    defense: 40,
    health: 300,
    moveSpeed: 0,
    spriteFile: "csm_O4.06.1972_2_7dca282331-removebg-preview.png",
  },
  {
    id: "unity-obsidian-ring",
    name: "OBSIDIAN RING",
    category: "Gear",
    price: 400,
    rarity: 4,
    descriptionEN: "A ring forged from obsidian, dark and smooth, pulsing with mysterious ancient energy.",
    descriptionTL: "Isang singsing na hinubog mula sa obsidian, madilim at makinis, naglalaman ng misteryosong sinaunang enerhiya.",
    order: 110,
    active: true,
    damage: 170,
    critRate: 0.2,
    critDamage: 0.3,
    gearType: "Ring",
    defense: 0,
    health: 0,
    moveSpeed: 0,
    spriteFile: "—Pngtree—game jewelry ring props_5916096.png",
  },
];

async function uploadIcon(bucket, itemId, spriteFile) {
  if (!spriteFile) return "";

  const localPath = new URL(`${UNITY_SPRITE_DIR}/${spriteFile}`, import.meta.url);
  const buffer = readFileSync(localPath);
  const storagePath = `shopItems/${itemId}.png`;
  const token = randomUUID();

  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const bucketName = bucket.name;
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(`${serviceAccount.projectId}.firebasestorage.app`);

  const requestedIds = process.argv.slice(2);
  const itemsToSeed = requestedIds.length > 0
    ? items.filter((item) => requestedIds.includes(item.id))
    : items;
  const missingIds = requestedIds.filter((id) => !items.some((item) => item.id === id));
  if (missingIds.length > 0) {
    throw new Error(`Unknown shop seed item ID(s): ${missingIds.join(", ")}`);
  }

  console.log(`Target Firebase project: ${serviceAccount.projectId}`);
  console.log(`Seeding ${itemsToSeed.length} item(s): ${itemsToSeed.map((item) => item.id).join(", ")}`);

  for (const item of itemsToSeed) {
    const { spriteFile, ...fields } = item;
    console.log(`Uploading icon for "${item.name}"...`);
    const imageUrl = await uploadIcon(bucket, item.id, spriteFile);

    const { id, ...rest } = fields;
    await db.collection("shopItems").doc(id).set(
      { ...rest, imageUrl, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log(`  -> shopItems/${id} written${imageUrl ? " (with icon)" : " (no icon in Unity, none uploaded)"}`);
  }

  console.log(`\nDone. ${itemsToSeed.length} items written to shopItems.`);
}

main().catch((err) => {
  console.error("seedShopItems failed:", err);
  process.exit(1);
});
