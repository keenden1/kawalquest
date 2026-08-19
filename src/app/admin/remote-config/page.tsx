"use client";

import { useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "error";

export default function RemoteConfigPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [showCheatButton, setShowCheatButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/remote-config").then((res) => res.json()).then((data) => {
      if (data.error) throw new Error(data.error);
      setShowCheatButton(Boolean(data.showCheatButton));
      setLoadState("ready");
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    });
  }, []);

  async function handleToggle() {
    const next = !showCheatButton;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/remote-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showCheatButton: next }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowCheatButton(Boolean(data.showCheatButton));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <header className="max-w-3xl"><p className="eyebrow">Live Operations</p><h1 className="page-title mt-2">Game flags</h1><p className="mt-4 text-base leading-7 text-stone-400">Control runtime behavior stored at <code className="rounded bg-white/5 px-1.5 py-1 text-sm text-stone-300">adminConfig/flags</code>.</p></header>
      <div className="flex gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5 text-sm text-amber-100/75"><span className="text-amber-300" aria-hidden="true">⚠</span><div><p className="font-bold text-amber-200">Game integration pending</p><p className="mt-1 leading-6"><code>AdminButtonGate.cs</code> does not read this flag yet, so changes are stored but do not affect the game client.</p></div></div>
      {loadState === "loading" && <div className="game-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-stone-400" role="status"><span className="size-4 animate-spin rounded-full border-2 border-emerald-300/25 border-t-emerald-300" />Loading current flag state...</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-200" role="alert">{error}</div>}
      {loadState !== "loading" && (
        <div className="game-panel flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2"><span className={`size-2 rounded-full ${showCheatButton ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-stone-600"}`} /><span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{showCheatButton ? "Enabled" : "Disabled"}</span></div><h2 className="text-lg font-bold text-white">Show Cheat button in-game</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">When disabled, the game should hide the Admin/Cheat button for every player.</p></div>
          <button onClick={handleToggle} disabled={saving} className={`relative h-10 w-[4.5rem] shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showCheatButton ? "border-emerald-300/30 bg-emerald-400" : "border-white/10 bg-stone-700"}`} aria-pressed={showCheatButton} aria-label="Show Cheat button in-game"><span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${showCheatButton ? "translate-x-9" : "translate-x-1"}`} /></button>
        </div>
      )}
    </div>
  );
}
