// Types + a defensive parser for the `saveData` field on players/{uid} -- the full
// JsonUtility.ToJson(playerData) blob written by SaveGame.BackupToCloud on the Unity
// side. Field names/casing here must match the Unity C# classes exactly (Assets/Scripts/
// SaveSystem/Player Data.cs) since that's what JsonUtility actually serializes -- note
// the WeaponData/GearData casing mismatch (CritRate/CritDamage vs critrate/critdamage)
// is real, not a typo, and comes straight from the Unity source.
//
// Deliberately read-only: nothing here writes back to saveData. See CLAUDE.md's
// "Web /inventory shows the real character" section for why (sync-timing + save-
// corruption risk of a partial round-trip through JsonUtility's serialization quirks).

export type ItemDataJson = {
  ItemID?: string;
  Itemname?: string;
  itemType?: string;
  SpritePath?: string;
  price?: number;
  DescriptionEN?: string;
  DescriptionTL?: string;
  ImageUrl?: string; // only present on items bought through the web-synced Shop (Phase 3)
};

export type WeaponDataJson = ItemDataJson & { damage?: number; CritRate?: number; CritDamage?: number; rarity?: number; type?: string; range?: number };
export type GearDataJson = ItemDataJson & { damage?: number; critrate?: number; critdamage?: number; defense?: number; health?: number; moveSpeed?: number; rarity?: number; type?: string };
export type ConsumableDataJson = ItemDataJson & { rarity?: number };
export type UsableDataJson = ItemDataJson & { rarity?: number; buffID?: string };
export type FindableDataJson = ItemDataJson & { rarity?: number };

export type CharacterInfoJson = {
  inventoryweap?: WeaponDataJson[];
  inventorygear?: GearDataJson[];
  inventoryConsumable?: ConsumableDataJson[];
  inventoryUsables?: UsableDataJson[];
  inventoryFindables?: FindableDataJson[];
  PendantEquiped?: GearDataJson | null;
  RingEquiped?: GearDataJson | null;
  weaponequiped?: WeaponDataJson | null;
  UsableEquipped?: UsableDataJson | null;
  Character?: number; // 0 = Boy, 1 = Girl (CharacterInfo.CharacterType in Unity)
};

export type PlayerSaveJson = {
  Level?: number;
  Exp?: number;
  MaxExp?: number;
  Gold?: number;
  upgradepoints?: number;
  CharacterInfo?: CharacterInfoJson;
};

export type ParsedPlayerSave = {
  level: number;
  exp: number;
  maxExp: number;
  gold: number;
  isBoy: boolean;
  weaponEquipped: WeaponDataJson | null;
  pendantEquipped: GearDataJson | null;
  ringEquipped: GearDataJson | null;
  usableEquipped: UsableDataJson | null;
  weapons: WeaponDataJson[];
  gear: GearDataJson[];
  consumables: ConsumableDataJson[];
  usables: UsableDataJson[];
  findables: FindableDataJson[];
};

export function parsePlayerSave(saveData: unknown): ParsedPlayerSave | null {
  if (typeof saveData !== "string" || !saveData) return null;

  let raw: PlayerSaveJson;
  try {
    raw = JSON.parse(saveData);
  } catch {
    return null;
  }

  const info = raw.CharacterInfo ?? {};
  return {
    level: raw.Level ?? 1,
    exp: raw.Exp ?? 0,
    maxExp: raw.MaxExp ?? 100,
    gold: raw.Gold ?? 0,
    isBoy: (info.Character ?? 0) === 0,
    weaponEquipped: info.weaponequiped ?? null,
    pendantEquipped: info.PendantEquiped ?? null,
    ringEquipped: info.RingEquiped ?? null,
    usableEquipped: info.UsableEquipped ?? null,
    weapons: info.inventoryweap ?? [],
    gear: info.inventorygear ?? [],
    consumables: info.inventoryConsumable ?? [],
    usables: info.inventoryUsables ?? [],
    findables: info.inventoryFindables ?? [],
  };
}

// Mirrors CharacterInfo.getrareritycolor in Player Data.cs exactly (rarity 1-5).
export const RARITY_COLORS: Record<number, string> = {
  1: "#e6e6e6",
  2: "#6fff6f",
  3: "#6fd2ff",
  4: "#c16fff",
  5: "#fdff6f",
};

export function rarityColor(rarity: number | undefined): string {
  return RARITY_COLORS[rarity ?? 0] ?? RARITY_COLORS[3];
}
