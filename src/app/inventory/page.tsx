import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { getSessionUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const slots = ["Weapon", "Armor", "Charm", "Supplies", "Quest item", "Collectible"];

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = (await getAdminDb().collection("players").doc(user.uid).get()).data();
  const gold = typeof profile?.mockGold === "number" ? profile.mockGold : 0;

  return (
    <main className="min-h-screen bg-[#050b08]">
      <PublicHeader active="/inventory" user={user} />
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Guardian equipment</p><h1 className="mt-3 text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl">Your inventory.</h1><p className="mt-4 max-w-xl leading-7 text-stone-500">Items earned during adventures and collected from the realm will appear here.</p></div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/8 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/60">Gold balance</p><p className="mt-1 text-2xl font-black text-amber-300">◆ {gold.toLocaleString()}</p></div>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{slots.map((slot) => <article key={slot} className="game-panel min-h-44 rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wider text-stone-400">{slot}</p><span className="text-stone-700">◇</span></div><div className="grid h-28 place-items-center"><p className="text-sm text-stone-600">Empty slot</p></div></article>)}</div>
      </section>
    </main>
  );
}
