"use client";

import { useEffect, useState, type FormEvent } from "react";

class ContentRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function readResponse(response: Response) {
  if (response.status === 401) throw new ContentRequestError("Your sign-in session is no longer valid. Sign in again in a new tab, then return here and retry. Your text is kept in this tab.", 401);
  if (response.status === 403) throw new ContentRequestError("An admin or superadmin account is required to edit About Kawal Quest.", 403);
  const data = await response.json();
  if (!response.ok) throw new ContentRequestError(data.error ?? "Could not load or save About content.", response.status);
  return data;
}

export default function AboutCreditsEditor() {
  const [activeEditor, setActiveEditor] = useState("about-english");
  const [credits, setCredits] = useState("");
  const [savedCredits, setSavedCredits] = useState("");
  const [aboutEnglish, setAboutEnglish] = useState("");
  const [aboutFilipino, setAboutFilipino] = useState("");
  const [savedEnglish, setSavedEnglish] = useState("");
  const [savedFilipino, setSavedFilipino] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function receive(data: { aboutTextEnglish?: unknown; aboutTextFilipino?: unknown; aboutCredits?: unknown }) {
    const english = typeof data.aboutTextEnglish === "string" ? data.aboutTextEnglish : "";
    const filipino = typeof data.aboutTextFilipino === "string" ? data.aboutTextFilipino : "";
    const credits = typeof data.aboutCredits === "string" ? data.aboutCredits : "";
    setAboutEnglish(english); setSavedEnglish(english);
    setAboutFilipino(filipino); setSavedFilipino(filipino);
    setCredits(credits); setSavedCredits(credits);
    setNeedsSignIn(false);
  }

  function showError(err: unknown) {
    setNeedsSignIn(err instanceof ContentRequestError && (err.status === 401 || err.status === 403));
    setError(err instanceof Error ? err.message : "Could not load or save About content.");
  }

  async function load() {
    try {
      const response = await fetch("/api/remote-config", { cache: "no-store", credentials: "same-origin" });
      const data = await readResponse(response);
      receive(data);
      setReady(true);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/remote-config", { cache: "no-store", credentials: "same-origin" })
      .then(readResponse)
      .then((data) => {
        if (!active) return;
        receive(data);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (active) showError(err);
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
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutCredits: credits, aboutTextEnglish: aboutEnglish, aboutTextFilipino: aboutFilipino }),
      });
      const data = await readResponse(response);
      receive(data);
      setSaved(true);
    } catch (err) {
      // Preserve all unsaved text when the session expires.
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="game-panel rounded-2xl p-6" aria-labelledby="about-credits-title">
      <h2 id="about-credits-title" className="text-lg font-bold text-white">About Kawal Quest</h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">Edit the About description and how-to-play text in English and Filipino, plus developer credits, shown in Settings → About Kawal Quest. The scoring guide remains generated from the game rules.</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="About content language and credits">
          {[["about-english", "English"], ["about-filipino", "Filipino"], ["about-credits", "Credits"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={activeEditor === id} onClick={() => setActiveEditor(id)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${activeEditor === id ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30" : "bg-white/5 text-stone-400 hover:text-white"}`}>{label}</button>
          ))}
        </div>
        {[
          { id: "about-english", language: "English", value: aboutEnglish, setValue: setAboutEnglish },
          { id: "about-filipino", language: "Filipino", value: aboutFilipino, setValue: setAboutFilipino },
        ].map(({ id, language, value, setValue }) => (
          <div key={id} hidden={activeEditor !== id}>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold text-stone-200">About Kawal Quest — {language}</label>
            <textarea id={id} value={value} rows={8} maxLength={8000} disabled={!ready || loading || saving}
              aria-describedby={`${id}-help`} placeholder={`Enter the ${language} About text`}
              onChange={(event) => { setValue(event.target.value); setSaved(false); }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none disabled:opacity-50" />
            <p id={`${id}-help`} className="mt-2 text-xs text-stone-400">Plain text. Leave blank to use the built-in {language} description and how-to-play text. {value.length}/8,000 characters.</p>
          </div>
        ))}
        <div hidden={activeEditor !== "about-credits"}>
        <label htmlFor="about-credits" className="mb-2 block text-sm font-semibold text-stone-200">Developers and credits</label>
        <textarea id="about-credits" value={credits} rows={7} maxLength={2000}
          disabled={!ready || loading || saving} aria-describedby="about-credits-help"
          onChange={(event) => { setCredits(event.target.value); setSaved(false); }}
          placeholder="Team name&#10;Developer name — Role"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none disabled:opacity-50" />
        <p id="about-credits-help" className="text-xs text-stone-400">Shared by both languages. Leave blank to hide credits. Plain text, one name or role per line. {credits.length}/2,000 characters.</p>
        </div>
        <button type="submit" disabled={!ready || loading || saving || (credits.trim() === savedCredits && aboutEnglish.trim() === savedEnglish && aboutFilipino.trim() === savedFilipino)}
          className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-extrabold text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Loading..." : saving ? "Saving..." : "Save About and credits"}
        </button>
        {!ready && !loading && <button type="button" onClick={() => { setLoading(true); setError(null); void load(); }} className="ml-3 text-sm text-amber-300 underline">Retry loading</button>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {needsSignIn && <a href="/login" target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-amber-300 underline">Sign in again (new tab)</a>}
        {saved && <p role="status" className="text-sm text-emerald-300">About and credits saved. Connected games with this update will receive the changes.</p>}
      </form>
      <details className="mt-5 rounded-xl border border-amber-300/20 bg-slate-900 p-4">
        <summary className="cursor-pointer text-sm font-bold text-amber-200">Preview selected content</summary>
        <p className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-stone-200">{activeEditor === "about-english" ? aboutEnglish.trim() || "The built-in English text will be shown." : activeEditor === "about-filipino" ? aboutFilipino.trim() || "The built-in Filipino text will be shown." : credits.trim() || "The credits section is hidden."}</p>
      </details>
    </section>
  );
}
