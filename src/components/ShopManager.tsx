"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";
import { GEAR_TYPES, SHOP_CATEGORIES, WEAPON_TYPES, type ShopCategory, type ShopItem, type ShopItemInput } from "@/lib/shopItems";

const PAGE_SIZE = 10;

const EMPTY_DRAFT: ShopItemInput = {
  name: "",
  category: "Findable",
  price: 0,
  rarity: 1,
  descriptionEN: "",
  descriptionTL: "",
  imageUrl: "",
  order: 0,
  active: true,
  comingSoon: false,
  damage: 0,
  critRate: 0,
  critDamage: 0,
  weaponType: null,
  range: 0,
  gearType: null,
  defense: 0,
  health: 0,
  moveSpeed: 0,
  buffID: "",
};

function toDraft(item: ShopItem): ShopItemInput {
  return {
    name: item.name,
    category: item.category,
    price: item.price,
    rarity: item.rarity,
    descriptionEN: item.descriptionEN,
    descriptionTL: item.descriptionTL,
    imageUrl: item.imageUrl,
    order: item.order,
    active: item.active,
    comingSoon: item.comingSoon,
    damage: item.damage,
    critRate: item.critRate,
    critDamage: item.critDamage,
    weaponType: item.weaponType,
    range: item.range,
    gearType: item.gearType,
    defense: item.defense,
    health: item.health,
    moveSpeed: item.moveSpeed,
    buffID: item.buffID,
  };
}

export default function ShopManager({ initialItems }: { initialItems: ShopItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ShopItemInput>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: ShopItem) {
    setEditingId(item.id);
    setDraft(toDraft(item));
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  function updateDraft<K extends keyof ShopItemInput>(key: K, value: ShopItemInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function changeCategory(category: ShopCategory) {
    setDraft((current) => ({
      ...current,
      category,
      weaponType: category === "Weapon" ? (current.weaponType ?? "Sword") : null,
      gearType: category === "Gear" ? (current.gearType ?? "Pendant") : null,
    }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/shop", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save this item.");
      const saved: ShopItem = data.item;
      setItems((current) => (editingId ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved].sort((a, b) => a.order - b.order)));
      setMessage(editingId ? "Item updated." : "Item created.");
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this item.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this shop item? This cannot be undone.")) return;
    setDeletingId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/shop", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to delete this item.");
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) closeModal();
      setMessage("Item deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to delete this item.");
    } finally {
      setDeletingId(null);
    }
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const filteredItems = search.trim() ? items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())) : items;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const pagedItems = filteredItems.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="game-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/7 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-white">Existing items</h2>
            <span className="rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">{items.length} items</span>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={changeSearch} placeholder="Search items..." />
            <button type="button" onClick={openCreate} className="shrink-0 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#172018] hover:bg-amber-200">
              + Add item
            </button>
          </div>
        </div>
        {message && <div className="border-b border-white/7 bg-emerald-400/7 px-5 py-3 text-xs text-emerald-200" role="status">{message}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/15"><tr>{["Item", "Category", "Price", "Rarity", "Status", ""].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/6">
              {pagedItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/3">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-9 shrink-0 rounded-lg border border-white/10 object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-amber-300/60">◆</span>}
                      <p className="font-bold text-stone-200">{item.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-stone-400">{item.category}</td>
                  <td className="px-5 py-4 font-mono text-amber-300">◆ {item.price.toLocaleString()}</td>
                  <td className="px-5 py-4 text-stone-400">{item.rarity}</td>
                  <td className="px-5 py-4">
                    {!item.active ? (
                      <span className="rounded-full bg-stone-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-stone-400">Hidden</span>
                    ) : item.comingSoon ? (
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-300">Coming Soon</span>
                    ) : (
                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-stone-300 hover:bg-white/8">Edit</button><button type="button" onClick={() => remove(item.id)} disabled={deletingId === item.id} className="rounded-lg border border-red-300/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/8 disabled:opacity-50">{deletingId === item.id ? "..." : "Delete"}</button></div></td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-stone-500">{items.length === 0 ? <>No shop items yet — click &quot;+ Add item&quot; above.</> : <>No items match &quot;{search}&quot;.</>}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={clampedPage} pageSize={PAGE_SIZE} totalItems={filteredItems.length} onChange={setPage} />
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? "Edit item" : "Add a new item"}
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-5 py-10 backdrop-blur-sm sm:items-center"
        >
          <div className="game-panel relative w-full max-w-3xl rounded-2xl p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-white">{editingId ? "Edit item" : "Add a new item"}</h2>
              <button type="button" onClick={closeModal} aria-label="Close" className="flex size-8 items-center justify-center rounded-full border border-white/10 text-lg font-black text-stone-400 hover:bg-white/8 hover:text-white">×</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Name<input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" placeholder="Divine Sword" /></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Category<select value={draft.category} onChange={(e) => changeCategory(e.target.value as ShopCategory)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1711] px-4 py-2.5 text-sm normal-case tracking-normal text-white">{SHOP_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Price (Gold)<input type="number" min={0} value={draft.price} onChange={(e) => updateDraft("price", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Rarity (1-5)<input type="number" min={1} max={5} value={draft.rarity} onChange={(e) => updateDraft("rarity", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Sort order<input type="number" value={draft.order} onChange={(e) => updateDraft("order", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>

              <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-stone-500"><input type="checkbox" checked={draft.active} onChange={(e) => updateDraft("active", e.target.checked)} className="size-4 rounded border-white/20 bg-black/20" />Active (visible in the Shop)</label>

              <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-stone-500 md:col-span-2">
                <input type="checkbox" checked={draft.comingSoon} onChange={(e) => updateDraft("comingSoon", e.target.checked)} className="size-4 rounded border-white/20 bg-black/20" />
                Coming Soon (shown on the site, not purchasable in-game)
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 md:col-span-2">Image URL (Firebase Storage download link)<input value={draft.imageUrl} onChange={(e) => updateDraft("imageUrl", e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" placeholder="https://firebasestorage.googleapis.com/..." /></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 md:col-span-2">Description (English)<textarea value={draft.descriptionEN} onChange={(e) => updateDraft("descriptionEN", e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 md:col-span-2">Description (Tagalog)<textarea value={draft.descriptionTL} onChange={(e) => updateDraft("descriptionTL", e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>

              {(draft.category === "Weapon" || draft.category === "Gear") && (
                <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Damage<input type="number" value={draft.damage} onChange={(e) => updateDraft("damage", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Crit rate (%)<input type="number" step="0.1" value={draft.critRate} onChange={(e) => updateDraft("critRate", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Crit damage (%)<input type="number" step="0.1" value={draft.critDamage} onChange={(e) => updateDraft("critDamage", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                </>
              )}

              {draft.category === "Weapon" && (
                <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Weapon type<select value={draft.weaponType ?? "Sword"} onChange={(e) => updateDraft("weaponType", e.target.value as ShopItemInput["weaponType"])} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1711] px-4 py-2.5 text-sm normal-case tracking-normal text-white">{WEAPON_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Range<input type="number" value={draft.range} onChange={(e) => updateDraft("range", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                </>
              )}

              {draft.category === "Gear" && (
                <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Gear type<select value={draft.gearType ?? "Pendant"} onChange={(e) => updateDraft("gearType", e.target.value as ShopItemInput["gearType"])} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1711] px-4 py-2.5 text-sm normal-case tracking-normal text-white">{GEAR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Defense<input type="number" value={draft.defense} onChange={(e) => updateDraft("defense", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Health<input type="number" value={draft.health} onChange={(e) => updateDraft("health", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Move speed<input type="number" step="0.1" value={draft.moveSpeed} onChange={(e) => updateDraft("moveSpeed", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
                </>
              )}

              {draft.category === "Usable" && (
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 md:col-span-2">
                  Buff ID
                  <input value={draft.buffID} onChange={(e) => updateDraft("buffID", e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm normal-case tracking-normal text-white" placeholder="Must match an existing buff asset name in Unity" />
                  <span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-stone-600">Must exactly match a buff ScriptableObject already in the Unity project (Assets/SO/BuffS/) — a typo does nothing in-game, silently.</span>
                </label>
              )}
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200" role="alert">{error}</p>}

            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={submit} disabled={saving || !draft.name} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save changes →" : "Create item →"}
              </button>
              <button type="button" onClick={closeModal} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-stone-300 hover:bg-white/8">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
