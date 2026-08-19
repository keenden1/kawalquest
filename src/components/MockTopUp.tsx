"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_TOP_UP_PACKAGES, type MockTopUpPackageId } from "@/lib/mockTopUp";

export default function MockTopUp({ initialBalance }: { initialBalance: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [selected, setSelected] = useState<MockTopUpPackageId>("guardian");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function topUp() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/top-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: selected, requestId: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Mock top-up failed.");
      setBalance(data.balance);
      setMessage(`${data.package.gold.toLocaleString()} mock gold added. No payment was charged.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mock top-up failed.");
    } finally { setPending(false); }
  }

  return <div className="space-y-6"><div className="game-panel flex items-center justify-between rounded-2xl p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Mock wallet balance</p><p className="mt-2 text-3xl font-black text-amber-300">◆ {balance.toLocaleString()}</p></div><span className="rounded-full border border-amber-300/15 bg-amber-300/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">Test currency</span></div>
    <div className="grid gap-4 md:grid-cols-3">{MOCK_TOP_UP_PACKAGES.map((item) => <button type="button" key={item.id} onClick={() => setSelected(item.id)} className={`quest-card rounded-2xl border p-5 text-left ${selected === item.id ? "border-amber-300/40 bg-amber-300/10" : "border-white/8 bg-white/3 hover:border-white/15"}`}><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{item.name}</span><p className="mt-4 text-2xl font-black text-white">◆ {item.gold.toLocaleString()}</p><p className="mt-2 text-sm text-stone-500">Mock value: {item.displayPrice}</p></button>)}</div>
    {message && <p className="rounded-xl border border-emerald-300/15 bg-emerald-300/7 p-4 text-sm text-emerald-200" role="status">{message}</p>}
    <button type="button" onClick={topUp} disabled={pending} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:opacity-50">{pending ? "Adding test gold..." : "Confirm mock top-up →"}</button>
    <p className="text-center text-xs leading-5 text-stone-600">This development flow does not contact Xsolla or GCash and does not charge real money.</p></div>;
}
