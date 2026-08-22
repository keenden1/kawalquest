"use client";

import { useEffect, useState } from "react";

export type CatalogItem = { id: string; name: string; category: string; price: number; rarity: number; imageUrl: string; descriptionEN: string };

export default function ShopItemGrid({ items }: { items: CatalogItem[] }) {
  const [zoomed, setZoomed] = useState<CatalogItem | null>(null);

  useEffect(() => {
    if (!zoomed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  return (
    <>
      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="game-panel overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => item.imageUrl && setZoomed(item)}
              disabled={!item.imageUrl}
              aria-label={item.imageUrl ? `Zoom in on ${item.name}` : undefined}
              className={`grid aspect-[4/3] w-full place-items-center overflow-hidden bg-gradient-to-br from-amber-300/10 to-emerald-400/5 ${item.imageUrl ? "cursor-zoom-in" : "cursor-default"}`}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="size-full object-cover transition-transform duration-200 hover:scale-105" />
              ) : (
                <span className="text-5xl text-amber-300/50">◆</span>
              )}
            </button>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{item.category}</p>
              <h2 className="mt-2 text-lg font-black text-white">{item.name}</h2>
              {item.descriptionEN && <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{item.descriptionEN}</p>}
              <p className="mt-4 text-sm font-bold text-amber-300">◆ {item.price.toLocaleString()} Gold</p>
            </div>
          </article>
        ))}
      </div>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomed.name} enlarged image`}
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
        >
          <div className="relative max-h-[85vh] max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Close"
              title="Close (Esc)"
              className="absolute -right-3 -top-3 flex size-10 items-center justify-center rounded-full border border-white/20 bg-[#0a1711] text-lg font-black text-white hover:bg-white/10"
            >
              ×
            </button>
            <img src={zoomed.imageUrl} alt={zoomed.name} className="max-h-[85vh] w-full rounded-2xl border border-white/10 object-contain" />
            <p className="mt-3 text-center text-sm font-bold uppercase tracking-widest text-amber-300">{zoomed.name}</p>
          </div>
        </div>
      )}
    </>
  );
}
