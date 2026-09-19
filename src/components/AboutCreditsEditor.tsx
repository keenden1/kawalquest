"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function AboutCreditsEditor() {
  const [credits, setCredits] = useState("");
  const [savedCredits, setSavedCredits] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/remote-config", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load credits.");
      const value = typeof data.aboutCredits === "string" ? data.aboutCredits : "";
      setCredits(value);
      setSavedCredits(value);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load credits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/remote-config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load credits.");
        return typeof data.aboutCredits === "string" ? data.aboutCredits : "";
      })
      .then((value) => {
        if (!active) return;
        setCredits(value);
        setSavedCredits(value);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load credits.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/remote-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutCredits: credits }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save credits.");
      setCredits(data.aboutCredits);
      setSavedCredits(data.aboutCredits);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save credits.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="game-panel rounded-2xl p-6" aria-labelledby="about-credits-title">
      <h2 id="about-credits-title" className="text-lg font-bold text-white">About Kawal Quest — Credits</h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">Edit the developer names, team name, and acknowledgments shown in Settings → About Kawal Quest. Names appear in both languages. Leave blank to hide the credits section.</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <label htmlFor="about-credits" className="block text-sm font-semibold text-stone-200">Developers and credits</label>
        <textarea id="about-credits" value={credits} rows={7} maxLength={2000}
          disabled={!ready || loading || saving} aria-describedby="about-credits-help"
          onChange={(event) => { setCredits(event.target.value); setSaved(false); }}
          placeholder="Team name&#10;Developer name — Role"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none disabled:opacity-50" />
        <p id="about-credits-help" className="text-xs text-stone-400">Plain text, one name or role per line. {credits.length}/2,000 characters.</p>
        <button type="submit" disabled={!ready || loading || saving || credits.trim() === savedCredits}
          className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-extrabold text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Loading..." : saving ? "Saving..." : "Save credits"}
        </button>
        {!ready && !loading && <button type="button" onClick={() => { setLoading(true); setError(null); void load(); }} className="ml-3 text-sm text-amber-300 underline">Retry loading</button>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {saved && <p role="status" className="text-sm text-emerald-300">Credits saved. Connected games with the About update will receive the changes.</p>}
      </form>
      <div className="mt-6 rounded-xl border border-amber-300/20 bg-slate-900 p-5">
        <h3 className="text-sm font-bold text-amber-200">Credits preview</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-stone-200">{credits.trim() || "The credits section is hidden."}</p>
      </div>
    </section>
  );
}
