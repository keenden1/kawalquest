"use client";

import { useEffect, useState, type FormEvent } from "react";

import AboutCreditsEditor from "@/components/AboutCreditsEditor";
import MobPreviewGallery from "@/components/MobPreviewGallery";
import { UNITY_BOSS_NAMES, MOB_TYPES } from "@/lib/contentNames";

const DEFAULT_MOB_COUNTS = [[4,4],[7,9],[6,10],[6,6],[15,6],[6,6],[6,6],[6,6],[6,6],[6,6]];

type LoadState = "loading" | "ready" | "error";
const sections = [
  { id: "about", label: "About & credits" },
  { id: "characters", label: "Characters" },
  { id: "mobs", label: "Mobs" },
  { id: "counts", label: "Mob counts" },
  { id: "bosses", label: "Bosses" },
  { id: "chase", label: "Chase distance" },
  { id: "testing", label: "Tester access" },
  { id: "downloads", label: "Downloads" },
] as const;
type Section = (typeof sections)[number]["id"];


export default function RemoteConfigPage() {
  const [section, setSection] = useState<Section>("about");
  const [selectedArc, setSelectedArc] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [showCheatButton, setShowCheatButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mobCounts, setMobCounts] = useState<string[]>(Array(20).fill(""));
  const [countInputs, setCountInputs] = useState<string[]>(Array(20).fill(""));
  const [chaseDistances, setChaseDistances] = useState<string[]>(Array(10).fill(""));
  const [chaseInputs, setChaseInputs] = useState<string[]>(Array(10).fill(""));
  const [mobNames, setMobNames] = useState<string[]>(MOB_TYPES.map((type) => type.name));
  const [mobNameInputs, setMobNameInputs] = useState<string[]>(MOB_TYPES.map((type) => type.name));
  const [bossNames, setBossNames] = useState<string[]>(UNITY_BOSS_NAMES);
  const [bossNameInputs, setBossNameInputs] = useState<string[]>(UNITY_BOSS_NAMES);
  const [boyCharacterName, setBoyCharacterName] = useState("David");
  const [boyCharacterNameInput, setBoyCharacterNameInput] = useState("David");
  const [girlCharacterName, setGirlCharacterName] = useState("Clarisa");
  const [girlCharacterNameInput, setGirlCharacterNameInput] = useState("Clarisa");
  const [savingNames, setSavingNames] = useState(false);
  const [namesError, setNamesError] = useState<string | null>(null);
  const [namesSaved, setNamesSaved] = useState(false);

  const [apkDownloadUrl, setApkDownloadUrl] = useState("");
  const [apkUrlInput, setApkUrlInput] = useState("");
  const [savingApkUrl, setSavingApkUrl] = useState(false);
  const [apkUrlError, setApkUrlError] = useState<string | null>(null);
  const [apkUrlSaved, setApkUrlSaved] = useState(false);

  const [apkDownloadEnabled, setApkDownloadEnabled] = useState(false);
  const [savingApkEnabled, setSavingApkEnabled] = useState(false);
  const [apkEnabledError, setApkEnabledError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  useEffect(() => {
    fetch("/api/remote-config").then((res) => res.json()).then((data) => {
      if (data.error) throw new Error(data.error);
      setShowCheatButton(Boolean(data.showCheatButton));
      setApkDownloadUrl(typeof data.apkDownloadUrl === "string" ? data.apkDownloadUrl : "");
      setApkUrlInput(typeof data.apkDownloadUrl === "string" ? data.apkDownloadUrl : "");
      setApkDownloadEnabled(Boolean(data.apkDownloadEnabled));
      const loadedBossNames = Array.isArray(data.bossNames) && data.bossNames.length === 10
        ? data.bossNames.map((value: unknown) => typeof value === "string" ? value : "")
        : UNITY_BOSS_NAMES;
      const loadedMobNames = Array.isArray(data.mobTypeNames) && data.mobTypeNames.length === MOB_TYPES.length
        ? data.mobTypeNames.map((value: unknown, index: number) => typeof value === "string" ? value : MOB_TYPES.map((type) => type.name)[index])
        : MOB_TYPES.map((type) => type.name);
      const loadedChase = Array.from({ length: 10 }, (_, index) => {
        const value = data.mobChaseDistances?.[index];
        return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? String(value) : "";
      });
      const loadedCounts = Array.from({ length: 20 }, (_, i) => {
        const value = data.mobCounts?.[i];
        return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? String(value) : "";
      });
      setMobCounts(loadedCounts);
      setCountInputs(loadedCounts);
      setChaseDistances(loadedChase);
      setChaseInputs(loadedChase);
      setMobNames(loadedMobNames);
      setMobNameInputs(loadedMobNames);
      setBossNames(loadedBossNames);
      setBossNameInputs(loadedBossNames);
      setBoyCharacterName(typeof data.boyCharacterName === "string" ? data.boyCharacterName : "David");
      setBoyCharacterNameInput(typeof data.boyCharacterName === "string" ? data.boyCharacterName : "David");
      setGirlCharacterName(typeof data.girlCharacterName === "string" ? data.girlCharacterName : "Clarisa");
      setGirlCharacterNameInput(typeof data.girlCharacterName === "string" ? data.girlCharacterName : "Clarisa");
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

  async function handleToggleApkEnabled() {
    const next = !apkDownloadEnabled;
    setSavingApkEnabled(true);
    setApkEnabledError(null);
    try {
      const res = await fetch("/api/remote-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apkDownloadEnabled: next }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setApkDownloadEnabled(Boolean(data.apkDownloadEnabled));
    } catch (err) {
      setApkEnabledError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingApkEnabled(false);
    }
  }

  async function handleSaveNames(e: FormEvent) {
    e.preventDefault();
    setSavingNames(true);
    setNamesError(null);
    setNamesSaved(false);
    try {
      const payload = {
        ...(section === "counts" ? { mobCounts: countInputs.map(value => value.trim() === "" ? null : Number(value)) } : {}),
        ...(section === "chase" ? { mobChaseDistances: chaseInputs.map((value) => value.trim() === "" ? null : Number(value)) } : {}),
        ...(section === "mobs" ? { mobTypeNames: mobNameInputs.map((value) => value.trim()) } : {}),
        ...(section === "bosses" ? { bossNames: bossNameInputs.map((value) => value.trim()) } : {}),
        ...(section === "characters" ? { boyCharacterName: boyCharacterNameInput.trim(), girlCharacterName: girlCharacterNameInput.trim() } : {}),
      };
      const res = await fetch("/api/remote-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Names could not be saved.");
      if (payload.mobCounts) {
        const saved = (data.mobCounts ?? payload.mobCounts).map((value: number | null) => value === null ? "" : String(value));
        setMobCounts(saved); setCountInputs(saved);
      }
      if (payload.mobChaseDistances) {
      const savedChase = (data.mobChaseDistances ?? payload.mobChaseDistances).map((value: number | null) => value === null ? "" : String(value));
      setChaseDistances(savedChase);
      setChaseInputs(savedChase);
      }
      if (payload.mobTypeNames) {
      const savedMobNames = Array.isArray(data.mobTypeNames) ? data.mobTypeNames : payload.mobTypeNames;
      setMobNames(savedMobNames);
      setMobNameInputs(savedMobNames);
      }
      if (payload.bossNames) {
      const savedBossNames = Array.isArray(data.bossNames) ? data.bossNames : payload.bossNames;
      setBossNames(savedBossNames);
      setBossNameInputs(savedBossNames);
      }
      if (payload.boyCharacterName !== undefined && payload.girlCharacterName !== undefined) {
      setBoyCharacterName(data.boyCharacterName ?? payload.boyCharacterName);
      setBoyCharacterNameInput(data.boyCharacterName ?? payload.boyCharacterName);
      setGirlCharacterName(data.girlCharacterName ?? payload.girlCharacterName);
      setGirlCharacterNameInput(data.girlCharacterName ?? payload.girlCharacterName);
      }
      setNamesSaved(true);
    } catch (err) {
      setNamesError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingNames(false);
    }
  }

  async function handleSaveApkUrl(e: FormEvent) {
    e.preventDefault();
    setSavingApkUrl(true);
    setApkUrlError(null);
    setApkUrlSaved(false);
    try {
      const res = await fetch("/api/remote-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apkDownloadUrl: apkUrlInput.trim() }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setApkDownloadUrl(data.apkDownloadUrl ?? "");
      setApkUrlInput(data.apkDownloadUrl ?? "");
      setApkUrlSaved(true);
    } catch (err) {
      setApkUrlError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingApkUrl(false);
    }
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setApkUrlSaved(false);
    try {
      const presignRes = await fetch("/api/admin/apk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
      });
      const presignData = await presignRes.json();
      if (presignData.error) throw new Error(presignData.error);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignData.uploadUrl);
        xhr.setRequestHeader("Content-Type", presignData.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload to storage failed (status ${xhr.status}).`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      });

      const saveRes = await fetch("/api/remote-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apkDownloadUrl: presignData.publicUrl }) });
      const saveData = await saveRes.json();
      if (saveData.error) throw new Error(saveData.error);
      setApkDownloadUrl(saveData.apkDownloadUrl ?? "");
      setApkUrlInput(saveData.apkDownloadUrl ?? "");
      setApkUrlSaved(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  const sectionDirty = {
    counts: countInputs.some((value, i) => (value.trim() === "" ? "" : String(Number(value))) !== mobCounts[i]),
    characters: boyCharacterNameInput.trim() !== boyCharacterName || girlCharacterNameInput.trim() !== girlCharacterName,
    mobs: mobNameInputs.some((value, index) => value.trim() !== mobNames[index]),
    bosses: bossNameInputs.some((value, index) => value.trim() !== bossNames[index]),
    chase: chaseInputs.some((value, index) => (value.trim() === "" ? "" : String(Number(value))) !== chaseDistances[index]),
    about: false, testing: false, downloads: apkUrlInput.trim() !== apkDownloadUrl,
  };

  return (
    <div className="space-y-7">
      <header><p className="eyebrow">Live Operations</p><h1 className="page-title mt-2">Game controls</h1><p className="mt-2 text-sm text-stone-400">Choose a section to edit. Saved changes reach connected games.</p></header>
      <nav aria-label="Game control sections" className="sticky top-16 z-30 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#0b1b14] p-3 shadow-lg">
        {sections.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={section === id} disabled={savingNames}
            onClick={() => { setSection(id); setNamesSaved(false); setNamesError(null); }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${section === id ? "bg-amber-300 text-[#172018]" : "text-stone-300 hover:bg-white/10"}`}>
            {label}{sectionDirty[id] && <span className="ml-1" aria-label="Unsaved changes">?</span>}
          </button>
        ))}
      </nav>
      <div hidden={section !== "about"}><AboutCreditsEditor /></div>
      {loadState === "loading" && <div className="game-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-stone-400" role="status"><span className="size-4 animate-spin rounded-full border-2 border-emerald-300/25 border-t-emerald-300" />Loading current flag state...</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-200" role="alert">{error}</div>}
      {loadState !== "loading" && section === "testing" && (
        <div className="game-panel flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2"><span className={`size-2 rounded-full ${showCheatButton ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-stone-600"}`} /><span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tester access {showCheatButton ? "enabled" : "disabled"}</span></div><h2 className="text-lg font-bold text-white">Tester Cheat button</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Turns the in-game Cheat button on or off for tester accounts. Regular player accounts never see it.</p></div>
          <button onClick={handleToggle} disabled={saving} className={`relative h-10 w-[4.5rem] shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showCheatButton ? "border-emerald-300/30 bg-emerald-400" : "border-white/10 bg-stone-700"}`} aria-pressed={showCheatButton} aria-label="Enable the in-game Cheat button for tester accounts"><span className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${showCheatButton ? "translate-x-8" : "translate-x-0"}`} /></button>
        </div>
      )}
      {loadState !== "loading" && ["characters", "mobs", "bosses", "chase", "counts"].includes(section) && (
        <section className="game-panel rounded-2xl p-6" aria-labelledby="content-names-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Player-facing content</p>
              <h2 id="content-names-heading" className="mt-2 text-xl font-bold text-white">{sections.find((item) => item.id === section)?.label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">Edit this section, then save. Unsaved changes stay here when you switch sections.</p>
            </div>
            <span className="w-fit rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live in game</span>
          </div>
          <form onSubmit={handleSaveNames} className="mt-6">
            <fieldset disabled={savingNames || loadState !== "ready"}>
            {(section === "bosses" || section === "chase") && <label className="mb-5 block max-w-sm text-sm font-bold text-stone-200">Choose arc
              <select value={selectedArc} onChange={(event) => setSelectedArc(Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#10241b] px-4 py-3 text-white">
                {Array.from({ length: 10 }, (_, index) => <option key={index} value={index}>Arc {index + 1}{(section === "bosses" ? bossNameInputs[index].trim() !== bossNames[index] : chaseInputs[index] !== chaseDistances[index]) ? " ? unsaved" : ""}</option>)}
              </select>
            </label>}
            {section === "characters" && <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-stone-200">
                David&apos;s name
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">Shown on David&apos;s character-selection option and biography.</span>
                <input type="text" value={boyCharacterNameInput} required minLength={2} maxLength={40} onChange={(e) => { setBoyCharacterNameInput(e.target.value); setNamesSaved(false); }} className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-stone-200">
                Clarisa&apos;s name
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">Shown on Clarisa&apos;s character-selection option and biography.</span>
                <input type="text" value={girlCharacterNameInput} required minLength={2} maxLength={40} onChange={(e) => { setGirlCharacterNameInput(e.target.value); setNamesSaved(false); }} className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none" />
              </label>
            </div>}
            {section === "counts" && <div>
              <h3 className="text-base font-bold text-white">Regular mobs per level</h3>
              <p className="mt-1 text-sm leading-6 text-stone-400">Choose 0?100 mobs. Leave blank to restore the default shown. Changes apply on the next level entry after the game receives them. Level 3 bosses stay fixed.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {DEFAULT_MOB_COUNTS.map((defaults, arc) => <div key={arc} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h4 className="font-bold text-amber-300">Arc {arc + 1}</h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">{defaults.map((fallback, level) => {
                    const index = arc * 2 + level;
                    return <label key={level} className="text-sm text-stone-300">Level {level + 1}
                      <input type="number" min={0} max={100} step={1} placeholder={String(fallback)} value={countInputs[index]}
                        onChange={e => { const next = [...countInputs]; next[index] = e.target.value; setCountInputs(next); setNamesSaved(false); }}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1b14] px-4 py-3 text-white focus:border-amber-300 focus:outline-none" />
                      <span className="mt-1 block text-xs text-stone-500">Default: {fallback} mobs</span>
                    </label>;
                  })}</div>
                </div>)}
              </div>
              <button type="button" className="mt-4 text-sm font-bold text-amber-300" onClick={() => { setCountInputs(Array(20).fill("")); setNamesSaved(false); }}>Restore all defaults</button>
            </div>}
            {section === "mobs" && <div>
              <h3 className="text-base font-bold text-white">Mob names by type</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">Edit a type once to rename every mob of that type across all arcs. Click a picture to enlarge it.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {mobNameInputs.map((value, index) => (
                  <div key={index} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <MobPreviewGallery model={MOB_TYPES[index].model} kind="mob" />
                    <label className="mt-3 block text-sm font-bold text-stone-200">
                    {MOB_TYPES[index].name} name
                    <input type="text" value={value} required minLength={2} maxLength={40} onChange={(e) => { const next = [...mobNameInputs]; next[index] = e.target.value; setMobNameInputs(next); setNamesSaved(false); }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none" />
                  </label>
                    <p className="mt-2 text-xs text-stone-500">Applies to every {MOB_TYPES[index].name} in all arcs.</p>
                  </div>
                ))}
              </div>
            </div>}
            {section === "chase" && <div>
              <h3 className="text-base font-bold text-white">Chase distances by arc</h3>
              <div className="mt-4 max-w-xl space-y-4">
                {chaseInputs.map((_, index) => index === selectedArc ? (
                  <div key={index} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <label className="mt-3 block text-sm font-bold text-stone-200">
                      Arc {index + 1} chase distance (metres)
                      <input type="number" min={0} max={100} step="any" value={chaseInputs[index]} placeholder="Use game setting" onChange={(e) => { const next = [...chaseInputs]; next[index] = e.target.value; setChaseInputs(next); setNamesSaved(false); }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none" />
                      <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">0-100 m. Blank restores each mob&apos;s game setting; 0 disables chasing. Applies to regular mobs in this arc.</span>
                    </label>
                  </div>
                ) : null)}
              </div>
            </div>}
            {section === "bosses" && <div>
              <h3 className="text-base font-bold text-white">Boss names by arc</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">The actual boss model for each arc is shown below. Edit its name to change the boss health-bar label in game.</p>
              <div className="mt-4 max-w-xl space-y-4">
                {bossNameInputs.map((value, index) => index === selectedArc ? (
                  <div key={index} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <MobPreviewGallery arc={index + 1} kind="boss" />
                    <label className="mt-3 block text-sm font-bold text-stone-200">
                    Arc {index + 1} boss
                    <input type="text" value={value} required minLength={2} maxLength={40} onChange={(e) => { const next = [...bossNameInputs]; next[index] = e.target.value; setBossNameInputs(next); setNamesSaved(false); }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-amber-300/50 focus:outline-none" />
                  </label>
                  </div>
                ) : null)}
              </div>
            </div>}
            <div className="sticky bottom-3 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#10241b] p-3">
              <button type="submit" disabled={loadState !== "ready" || savingNames || !sectionDirty[section]} className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-extrabold text-[#172018] shadow-lg shadow-amber-950/20 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                {savingNames ? "Saving..." : `Save ${sections.find((item) => item.id === section)?.label.toLowerCase()}`}
              </button>
              {namesSaved && !namesError && <p className="text-sm font-bold text-emerald-300" role="status">Success — settings saved and sent to the game.</p>}
              {namesError && <p className="text-sm text-red-300" role="alert">{namesError}</p>}
            </div>
            </fieldset>
          </form>
        </section>
      )}
      {loadState !== "loading" && section === "downloads" && (
        <div className="game-panel rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className={`size-2 rounded-full ${apkDownloadEnabled ? (apkDownloadUrl ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-amber-400 shadow-[0_0_10px_#fbbf24]") : "bg-stone-600"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{apkDownloadEnabled ? (apkDownloadUrl ? "Live" : "Enabled, no link set") : "Maintenance"}</span>
          </div>

          <div className="flex flex-col gap-6 border-b border-white/7 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-bold text-white">Download availability</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">When off, the public site shows a &quot;Under maintenance&quot; notice instead of the download button.</p></div>
            <button onClick={handleToggleApkEnabled} disabled={savingApkEnabled} className={`relative h-10 w-[4.5rem] shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${apkDownloadEnabled ? "border-emerald-300/30 bg-emerald-400" : "border-white/10 bg-stone-700"}`} aria-pressed={apkDownloadEnabled} aria-label="Enable APK download"><span className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${apkDownloadEnabled ? "translate-x-8" : "translate-x-0"}`} /></button>
          </div>
          {apkEnabledError && <p className="mt-3 text-sm text-red-300" role="alert">{apkEnabledError}</p>}

          <h2 className="mt-6 text-lg font-bold text-white">Upload APK</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Upload a build directly to storage. This replaces the link below once the upload finishes.</p>
          <div className="mt-4 flex flex-col gap-3">
            <label className={`inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 ${uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              {uploading ? "Uploading..." : "Choose .apk file"}
              <input
                type="file"
                accept=".apk"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleFileSelected(file);
                }}
              />
            </label>
            {uploading && (
              <div className="max-w-md">
                <div className="flex items-center justify-between text-xs text-stone-500"><span className="truncate">{uploadFileName}</span><span>{uploadProgress}%</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
              </div>
            )}
            {uploadError && <p className="text-sm text-red-300" role="alert">{uploadError}</p>}
          </div>

          <h2 className="mt-8 text-lg font-bold text-white">APK download link</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">The URL the public site&apos;s &quot;Download APK&quot; button links to when downloads are on. Leave empty to show &quot;Download coming soon&quot; instead.</p>
          <form onSubmit={handleSaveApkUrl} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="url"
              value={apkUrlInput}
              onChange={(e) => { setApkUrlInput(e.target.value); setApkUrlSaved(false); }}
              placeholder="https://example.com/kawal-quest.apk"
              className="w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-emerald-300/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingApkUrl || apkUrlInput.trim() === apkDownloadUrl}
              className="shrink-0 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-extrabold text-[#172018] shadow-lg shadow-amber-950/20 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingApkUrl ? "Saving..." : "Save link"}
            </button>
          </form>
          {apkUrlError && <p className="mt-3 text-sm text-red-300" role="alert">{apkUrlError}</p>}
          {apkUrlSaved && !apkUrlError && <p className="mt-3 text-sm text-emerald-300">Saved.</p>}
        </div>
      )}
    </div>
  );
}
