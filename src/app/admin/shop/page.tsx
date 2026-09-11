import { redirect } from "next/navigation";
import ShopManager from "@/components/ShopManager";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ShopItem } from "@/lib/shopItems";

export default async function AdminShopPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/account");

  const snapshot = await getAdminDb().collection("shopItems").orderBy("order", "asc").get();
  const items: ShopItem[] = snapshot.docs.map((doc) => {
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
      comingSoon: Boolean(data.comingSoon),
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
  });

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="eyebrow">Realm Market</p>
        <h1 className="page-title mt-2">Shop items</h1>
        <p className="mt-4 text-base leading-7 text-stone-400">
          Manage the items sold on the public Shop page. Weapon and Gear items also carry combat stats that the game reads when a
          player buys one.
        </p>
      </header>
      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm leading-6 text-amber-100/70">
        <strong className="text-amber-200">Icons are hosted, not uploaded here.</strong> Upload the item image to Firebase Storage
        first (Console → Storage), then paste its public download URL into the Image URL field below — same as how the site&apos;s
        own logo is hosted.
      </div>
      <ShopManager initialItems={items} />
    </div>
  );
}
