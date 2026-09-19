"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  rarity: number;
  imageUrl: string;
  descriptionEN: string;
  comingSoon: boolean;
  character: "Boy" | "Girl" | null; // null = usable by either character (non-Weapon items)
};

type CharacterFilter = "All" | "Boy" | "Girl";

export default function ShopItemGrid({ items }: { items: CatalogItem[] }) {
  const [zoomed, setZoomed] = useState<CatalogItem | null>(null);
  const [characterFilter, setCharacterFilter] = useState<CharacterFilter>("All");

  useEffect(() => {
    if (!zoomed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  const hasCharacterItems = items.some((item) => item.character !== null);
  const visibleItems = characterFilter === "All" ? items : items.filter((item) => item.character === null || item.character === characterFilter);

  return (
    <>
      {hasCharacterItems && (
        <div className="mt-10 flex items-center gap-2" role="group" aria-label="Filter by character">
          {(["All", "Boy", "Girl"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCharacterFilter(option)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                characterFilter === option ? "bg-amber-300 text-[#172018]" : "border border-white/10 text-stone-400 hover:bg-white/8"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="game-panel mt-8 rounded-3xl p-10 text-center text-stone-500">No items for that character yet.</div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {visibleItems.map((item) => (
            <article key={item.id} className={`game-panel relative overflow-hidden rounded-2xl ${item.comingSoon ? "opacity-70" : ""}`}>
              {item.comingSoon && (
                <span className="absolute right-3 top-3 z-10 rounded-full border border-amber-300/30 bg-[#0a1711]/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Coming Soon
                </span>
              )}
              {item.character && (
                <span className="absolute left-3 top-3 z-10 rounded-full border border-emerald-300/30 bg-[#0a1711]/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  {item.character}
                </span>
              )}
              <button
                type="button"
                onClick={() => item.imageUrl && setZoomed(item)}
                disabled={!item.imageUrl}
                aria-label={item.imageUrl ? `Zoom in on ${item.name}` : undefined}
                className={`relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-gradient-to-br from-amber-300/10 to-emerald-400/5 ${item.imageUrl ? "cursor-zoom-in" : "cursor-default"}`}
              >
                {item.imageUrl ? (
                  <Image fill sizes="(max-width: 640px) 100vw, 33vw" src={item.imageUrl} alt={item.name} className={`object-cover transition-transform duration-200 ${item.comingSoon ? "grayscale" : "hover:scale-105"}`} />
                ) : (
                  <span className="text-5xl text-amber-300/50">◆</span>
                )}
              </button>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{item.category}</p>
                <h2 className="mt-2 text-lg font-black text-white">{item.name}</h2>
                {item.descriptionEN && <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{item.descriptionEN}</p>}
                <p className="mt-4 text-sm font-bold text-amber-300">{item.comingSoon ? "Not yet available" : `◆ ${item.price.toLocaleString()} Gold`}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomed.name} enlarged image`}
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Close"
              title="Close (Esc)"
              className="absolute -right-3 -top-3 flex size-10 items-center justify-center rounded-full border border-white/20 bg-[#0a1711] text-lg font-black text-white hover:bg-white/10"
            >
              ×
            </button>
            <div className="relative h-[75vh] max-h-[720px] w-[90vw] max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Image fill sizes="(max-width: 768px) 90vw, 672px" src={zoomed.imageUrl} alt={zoomed.name} className="object-contain" />
            </div>
            <p className="mt-3 text-center text-sm font-bold uppercase tracking-widest text-amber-300">{zoomed.name}</p>
          </div>
        </div>
      )}
    </>
  );
}
