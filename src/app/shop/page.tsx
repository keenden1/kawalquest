import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import ShopItemGrid, { type CatalogItem } from "@/components/ShopItemGrid";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

async function getShopItems(): Promise<CatalogItem[]> {
  try {
    const snapshot = await getAdminDb().collection("shopItems").where("active", "==", true).orderBy("order", "asc").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, name: data.name ?? "Unnamed item", category: data.category ?? "Findable", price: data.price ?? 0, rarity: data.rarity ?? 1, imageUrl: data.imageUrl ?? "", descriptionEN: data.descriptionEN ?? "" };
    });
  } catch {
    return [];
  }
}

export default async function ShopPage() {
  const items = await getShopItems();
  return (
    <main className="min-h-screen bg-[#050b08]">
      <PublicHeader active="/shop" />
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28">
        <p className="eyebrow">Realm market</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">The Kawal shop.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">Equipment, supplies, and collectibles available to every guardian. Purchases are made with in-game Gold.</p>
        {items.length === 0 ? (
          <div className="game-panel mt-14 rounded-3xl p-10 text-center text-stone-500">The market is quiet right now — check back soon.</div>
        ) : (
          <ShopItemGrid items={items} />
        )}
        <div className="mt-10 rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm text-amber-100/70">Already a guardian? Your collected items are available in your <Link href="/inventory" className="font-bold text-amber-300 hover:text-amber-200">Inventory</Link>.</div>
      </section>
    </main>
  );
}
