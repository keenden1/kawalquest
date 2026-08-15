"use client";

import { useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "error";

export default function RemoteConfigPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [showCheatButton, setShowCheatButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/remote-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setShowCheatButton(Boolean(data.showCheatButton));
        setLoadState("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoadState("error");
      });
  }, []);

  async function handleToggle() {
    const next = !showCheatButton;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/remote-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showCheatButton: next }),
      });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Remote Config</h1>
        <p className="mt-1 text-slate-400">
          Flags read by the game at runtime. Writes to Firestore{" "}
          <code className="text-slate-300">adminConfig/flags</code>.
        </p>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-300">
        Unity-side wiring isn&apos;t done yet &mdash; <code>AdminButtonGate.cs</code> doesn&apos;t
        read this flag yet. Toggling this here won&apos;t change the game until that&apos;s built.
      </div>

      {loadState === "loading" && (
        <div className="text-sm text-slate-400">Loading current flag state...</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loadState !== "loading" && (
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-5">
          <div>
            <h2 className="font-medium text-slate-100">Show Cheat button in-game</h2>
            <p className="mt-1 text-sm text-slate-400">
              When off, the game should hide the Admin/Cheat button for all players.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              showCheatButton ? "bg-emerald-500" : "bg-slate-700"
            }`}
            aria-pressed={showCheatButton}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                showCheatButton ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
