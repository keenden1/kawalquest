// Pure data/validation only (no env vars, no firebase-admin) -- deliberately not
// "server-only" so both the API route and the admin form component can import it.

// Mirrors the Unity project's ItemData subclasses (Assets/Scripts/SaveSystem/Player Data.cs)
// so a category maps 1:1 onto the inventory data class the game will build when a player
// buys the item: Weapon -> WeaponData, Gear -> GearData, Consumable -> ConsumableData,
// Usable -> UsableData, Findable -> FindableData.
export const SHOP_CATEGORIES = ["Weapon", "Gear", "Consumable", "Usable", "Findable"] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

// Mirrors Weapons.weapontype / Artifacts.artifactstype in the Unity project exactly --
// keep these in sync if the Unity enums ever change.
export const WEAPON_TYPES = ["Sword", "Book", "Claymore"] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export const GEAR_TYPES = ["Pendant", "Ring"] as const;
export type GearType = (typeof GEAR_TYPES)[number];

export type ShopItem = {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  rarity: number;
  descriptionEN: string;
  descriptionTL: string;
  imageUrl: string;
  order: number;
  active: boolean;
  createdAt: string | null;

  // Weapon + Gear share these
  damage: number;
  critRate: number;
  critDamage: number;

  // Weapon-only
  weaponType: WeaponType | null;
  range: number;

  // Gear-only
  gearType: GearType | null;
  defense: number;
  health: number;
  moveSpeed: number;

  // Usable-only -- must match the name/id of an existing buff ScriptableObject in the
  // Unity project (Assets/SO/BuffS/) for it to do anything in-game; not validated here.
  buffID: string;
};

export type ShopItemInput = Omit<ShopItem, "id" | "createdAt">;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// Shared by the create (POST) and update (PATCH) API handlers so both enforce the same
// shape -- a partial/malformed body should never reach Firestore.
export function parseShopItemInput(body: unknown): { data: ShopItemInput } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "A shop item payload is required." };
  const raw = body as Record<string, unknown>;

  const name = asString(raw.name);
  if (!name) return { error: "Item name is required." };

  const category = SHOP_CATEGORIES.includes(raw.category as ShopCategory) ? (raw.category as ShopCategory) : null;
  if (!category) return { error: `Category must be one of: ${SHOP_CATEGORIES.join(", ")}.` };

  const price = asNumber(raw.price);
  if (price < 0) return { error: "Price cannot be negative." };

  const rarity = Math.round(asNumber(raw.rarity, 1));
  if (rarity < 1 || rarity > 5) return { error: "Rarity must be between 1 and 5." };

  const imageUrl = asString(raw.imageUrl);
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { error: "Image URL must be a full http(s) link." };

  const weaponType = WEAPON_TYPES.includes(raw.weaponType as WeaponType) ? (raw.weaponType as WeaponType) : null;
  const gearType = GEAR_TYPES.includes(raw.gearType as GearType) ? (raw.gearType as GearType) : null;
  if (category === "Weapon" && !weaponType) return { error: "Weapon items need a weapon type (Sword, Book, or Claymore)." };
  if (category === "Gear" && !gearType) return { error: "Gear items need a gear type (Pendant or Ring)." };

  return {
    data: {
      name,
      category,
      price,
      rarity,
      descriptionEN: asString(raw.descriptionEN),
      descriptionTL: asString(raw.descriptionTL),
      imageUrl,
      order: asNumber(raw.order, 0),
      active: Boolean(raw.active),
      damage: asNumber(raw.damage),
      critRate: asNumber(raw.critRate),
      critDamage: asNumber(raw.critDamage),
      weaponType: category === "Weapon" ? weaponType : null,
      range: asNumber(raw.range),
      gearType: category === "Gear" ? gearType : null,
      defense: asNumber(raw.defense),
      health: asNumber(raw.health),
      moveSpeed: asNumber(raw.moveSpeed),
      buffID: category === "Usable" ? asString(raw.buffID) : "",
    },
  };
}
