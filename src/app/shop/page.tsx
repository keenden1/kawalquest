import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

const items = [{ name: "Guardian's Cache", type: "Supplies", price: "Coming soon" }, { name: "Sunforged Armor", type: "Outfit", price: "Coming soon" }, { name: "Island Banner", type: "Collectible", price: "Coming soon" }];

export default function ShopPage() {
  return <main className="min-h-screen bg-[#050b08]"><PublicHeader active="/shop" /><section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28"><p className="eyebrow">Realm market</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">The Kawal shop.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">Equipment, supplies, and collectibles will become available as the realm grows. No real purchases are active yet.</p><div className="mt-14 grid gap-4 sm:grid-cols-3">{items.map((item) => <article key={item.name} className="game-panel overflow-hidden rounded-2xl"><div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-amber-300/10 to-emerald-400/5 text-5xl text-amber-300/50">◆</div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{item.type}</p><h2 className="mt-2 text-lg font-black text-white">{item.name}</h2><p className="mt-4 text-sm font-bold text-stone-500">{item.price}</p></div></article>)}</div><div className="mt-10 rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm text-amber-100/70">Already a guardian? Your collected items are available in your <Link href="/inventory" className="font-bold text-amber-300 hover:text-amber-200">Inventory</Link>.</div></section></main>;
}
