"use client";

import { useState } from "react";
import { XSOLLA_TOPUP_PACKAGES, type XsollaPackageId } from "@/lib/xsolla";

export default function XsollaTopUp({ configured }: { configured: boolean }) {
  const [selected, setSelected] = useState<XsollaPackageId>("value_gold");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/xsolla-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to start checkout.");
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm leading-6 text-amber-100/70">
          <strong className="text-amber-200">Pending Xsolla approval.</strong> Real-money top-ups aren&apos;t live yet — packages are shown for preview, but purchases can&apos;t be completed until the project is approved.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {XSOLLA_TOPUP_PACKAGES.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSelected(item.id)}
            disabled={!configured}
            className={`quest-card rounded-2xl border p-5 text-left disabled:cursor-not-allowed disabled:opacity-50 ${selected === item.id ? "border-amber-300/40 bg-amber-300/10" : "border-white/8 bg-white/3 hover:border-white/15"}`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{item.name}</span>
            <p className="mt-4 text-2xl font-black text-white">◆ {item.gold.toLocaleString()}</p>
            <p className="mt-2 text-sm text-stone-500">{item.displayPrice}</p>
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-200" role="alert">{error}</p>}

      <button
        type="button"
        onClick={checkout}
        disabled={!configured || pending}
        className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Opening checkout..." : configured ? "Continue to Xsolla checkout →" : "Not available yet"}
      </button>

      <p className="text-center text-xs leading-5 text-stone-600">Gold from a real purchase is credited the next time you fully log in to the game (not instantly on this page) — see the account help for details.</p>
    </div>
  );
}
