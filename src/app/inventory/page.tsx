import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { getSessionUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { parsePlayerSave, rarityColor, type ItemDataJson } from "@/lib/playerSave";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const CHARACTER_PORTRAIT = {
  boy: process.env.CHARACTER_PORTRAIT_BOY_URL,
  girl: process.env.CHARACTER_PORTRAIT_GIRL_URL,
};

// Local Unity-only items have SpritePath but no web-accessible ImageUrl. Keep public
// copies here for display; remote purchases continue to use their saved/catalog URL.
const LOCAL_ITEM_IMAGES: Record<string, string> = {
  "obsidian warrior necklace": "/inventory/obsidian-warrior-necklace.png",
  "obsidian ring": "/inventory/obsidian-ring.png",
};

function ItemIcon({ item, size = "size-12" }: { item: ItemDataJson; size?: string }) {
  return item.ImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary Firebase Storage URL, not a fixed local asset set
    <img src={item.ImageUrl} alt="" className={`${size} shrink-0 rounded-xl border border-white/10 bg-black/20 object-contain p-1`} />
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-amber-300/50`}>◆</span>
  );
}

function normalizedName(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / new Set([...leftTokens, ...rightTokens]).size;
}

function EquippedSlot({ label, item }: { label: string; item: (ItemDataJson & { rarity?: number }) | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
      <ItemIcon item={item ?? {}} size="size-10" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
        {item ? (
          <p className="truncate text-sm font-bold" style={{ color: rarityColor(item.rarity) }} title={item.Itemname}>{item.Itemname ?? "Unknown item"}</p>
        ) : (
          <p className="text-sm text-stone-600">Nothing equipped</p>
        )}
      </div>
    </div>
  );
}

function ItemGrid({ title, items, equippedIds }: { title: string; items: (ItemDataJson & { rarity?: number })[]; equippedIds: Set<string> }) {
  if (items.length === 0) return null;
  return (
    <section className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">{title}</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-stone-400">{items.length}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-emerald-300/20 to-transparent" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const equipped = Boolean(item.ItemID && equippedIds.has(item.ItemID));
          return (
            <article key={item.ItemID ?? index} className={`game-panel group relative min-h-32 overflow-hidden rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/30 ${equipped ? "ring-1 ring-emerald-300/40" : ""}`}>
              {equipped && (
                <span className="absolute right-3 top-3 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">Equipped</span>
              )}
              <div className="flex items-start gap-4">
                <ItemIcon item={item} size="h-24 w-20" />
                <div className="min-w-0 flex-1 pt-1">
                <p className={`line-clamp-2 text-sm font-black leading-5 ${equipped ? "pr-16" : ""}`} style={{ color: rarityColor(item.rarity) }} title={item.Itemname}>
                  {item.Itemname ?? "Unknown item"}
                </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">{item.itemType ?? title.replace(/s$/, "")}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Rarity</span>
                <span className="text-xs font-black" style={{ color: rarityColor(item.rarity) }}>{item.rarity ?? "—"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getAdminDb();
  const [profileDocument, shopSnapshot] = await Promise.all([
    db.collection("players").doc(user.uid).get(),
    db.collection("shopItems").get(),
  ]);
  const profile = profileDocument.data();
  const save = parsePlayerSave(profile?.saveData);

  // Older/local Unity inventory records do not contain ImageUrl even when the same
  // item has artwork in the web Shop catalog. Hydrate display-only copies by name.
  if (save) {
    const catalogImages = shopSnapshot.docs
      .map((document) => document.data())
      .filter((item) => typeof item.name === "string" && typeof item.imageUrl === "string" && item.imageUrl)
      .map((item) => ({ name: normalizedName(item.name), imageUrl: item.imageUrl as string }));

    const addCatalogImage = (item: ItemDataJson | null) => {
      if (!item || item.ImageUrl) return;
      const name = normalizedName(item.Itemname);
      const localImage = LOCAL_ITEM_IMAGES[name];
      if (localImage) {
        item.ImageUrl = localImage;
        return;
      }
      const exact = catalogImages.find((catalogItem) => catalogItem.name === name);
      const ranked = exact ? [] : catalogImages
        .map((catalogItem) => ({ ...catalogItem, score: tokenSimilarity(name, catalogItem.name) }))
        .filter((catalogItem) => catalogItem.score >= 0.66)
        .sort((a, b) => b.score - a.score);
      const match = exact ?? (ranked.length === 1 || ranked[0]?.score > (ranked[1]?.score ?? 0) ? ranked[0] : undefined);
      if (match) item.ImageUrl = match.imageUrl;
    };

    [save.weaponEquipped, save.pendantEquipped, save.ringEquipped, save.usableEquipped,
      ...save.weapons, ...save.gear, ...save.consumables, ...save.usables, ...save.findables]
      .forEach(addCatalogImage);
  }

  return (
    <main className="min-h-screen bg-[#050b08]">
      <PublicHeader active="/inventory" user={user} />
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <div>
          <p className="eyebrow">Guardian equipment</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">Your inventory.</h1>
          <p className="mt-4 max-w-xl leading-7 text-stone-500">Your character and everything they&apos;ve collected in the realm, straight from your last save.</p>
        </div>

        {!save ? (
          <div className="game-panel mt-12 rounded-3xl p-10 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-2xl">◇</div>
            <h2 className="mt-4 font-bold text-white">No character data yet</h2>
            <p className="mt-1 text-sm text-stone-400">Play Kawal Quest and save your progress at least once — your character and items will show up here automatically.</p>
          </div>
        ) : (
          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="game-panel h-fit rounded-3xl p-5 lg:sticky lg:top-24">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-amber-300/10 to-emerald-400/5">
                {CHARACTER_PORTRAIT[save.isBoy ? "boy" : "girl"] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- hosted portrait, not a fixed local asset
                  <img src={CHARACTER_PORTRAIT[save.isBoy ? "boy" : "girl"]} alt={save.isBoy ? "Boy character" : "Girl character"} className="size-full object-cover object-top" />
                ) : (
                  <div className="grid size-full place-items-center text-6xl text-amber-300/30">◆</div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Level</p>
                  <p className="text-xl font-black text-white">{save.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60">Gold</p>
                  <p className="text-xl font-black text-amber-300">◆ {save.gold.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-5 text-[11px] leading-5 text-stone-600">Equipping from the web isn&apos;t available yet — change gear in-game, then save. Changes made here would only apply the next time you log in fully.</p>
            </aside>

            <div className="min-w-0 space-y-10">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">Current loadout</h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-amber-300/20 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <EquippedSlot label="Weapon" item={save.weaponEquipped} />
                  <EquippedSlot label="Pendant" item={save.pendantEquipped} />
                  <EquippedSlot label="Ring" item={save.ringEquipped} />
                  <EquippedSlot label="Usable" item={save.usableEquipped} />
                </div>
              </section>

              {(() => {
                const equippedIds = new Set(
                  [save.weaponEquipped?.ItemID, save.pendantEquipped?.ItemID, save.ringEquipped?.ItemID, save.usableEquipped?.ItemID].filter((id): id is string => Boolean(id))
                );
                const totalItems = save.weapons.length + save.gear.length + save.consumables.length + save.usables.length + save.findables.length;
                if (totalItems === 0) {
                  return (
                    <div className="game-panel rounded-2xl p-10 text-center text-stone-500">Your bags are empty — visit the <a href="/shop" className="font-bold text-amber-300 hover:text-amber-200">Shop</a> or keep questing to find gear.</div>
                  );
                }
                return (
                  <>
                    <ItemGrid title="Weapons" items={save.weapons} equippedIds={equippedIds} />
                    <ItemGrid title="Gear" items={save.gear} equippedIds={equippedIds} />
                    <ItemGrid title="Usables" items={save.usables} equippedIds={equippedIds} />
                    <ItemGrid title="Consumables" items={save.consumables} equippedIds={equippedIds} />
                    <ItemGrid title="Findables" items={save.findables} equippedIds={equippedIds} />
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
