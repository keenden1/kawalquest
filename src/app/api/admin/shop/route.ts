import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { parseShopItemInput, type ShopItem } from "@/lib/shopItems";

const COLLECTION = "shopItems";

function docToShopItem(doc: FirebaseFirestore.QueryDocumentSnapshot): ShopItem {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name ?? "",
    category: data.category ?? "Findable",
    price: data.price ?? 0,
    rarity: data.rarity ?? 1,
    descriptionEN: data.descriptionEN ?? "",
    descriptionTL: data.descriptionTL ?? "",
    imageUrl: data.imageUrl ?? "",
    order: data.order ?? 0,
    active: Boolean(data.active),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    damage: data.damage ?? 0,
    critRate: data.critRate ?? 0,
    critDamage: data.critDamage ?? 0,
    weaponType: data.weaponType ?? null,
    range: data.range ?? 0,
    gearType: data.gearType ?? null,
    defense: data.defense ?? 0,
    health: data.health ?? 0,
    moveSpeed: data.moveSpeed ?? 0,
    buffID: data.buffID ?? "",
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  try {
    const snapshot = await getAdminDb().collection(COLLECTION).orderBy("order", "asc").get();
    return NextResponse.json({ items: snapshot.docs.map(docToShopItem) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = parseShopItemInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc();
    await ref.set({ ...parsed.data, createdAt: FieldValue.serverTimestamp() });
    const snap = await ref.get();
    return NextResponse.json({ item: docToShopItem(snap as FirebaseFirestore.QueryDocumentSnapshot) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  const id = typeof body === "object" && body !== null && "id" in body ? String((body as { id?: unknown }).id ?? "") : "";
  if (!id) return NextResponse.json({ error: "An item id is required." }, { status: 400 });

  const parsed = parseShopItemInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc(id);
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Item not found." }, { status: 404 });
    await ref.set(parsed.data, { merge: true });
    const snap = await ref.get();
    return NextResponse.json({ item: docToShopItem(snap as FirebaseFirestore.QueryDocumentSnapshot) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  const id = typeof body === "object" && body !== null && "id" in body ? String((body as { id?: unknown }).id ?? "") : "";
  if (!id) return NextResponse.json({ error: "An item id is required." }, { status: 400 });

  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
