"use client";

import { useEffect, useState, type FormEvent } from "react";

type LoadState = "loading" | "ready" | "error";

export default function RemoteConfigPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [showCheatButton, setShowCheatButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-7">
      <header className="max-w-3xl"><p className="eyebrow">Live Operations</p><h1 className="page-title mt-2">Game flags</h1><p className="mt-4 text-base leading-7 text-stone-400">Control runtime behavior stored at <code className="rounded bg-white/5 px-1.5 py-1 text-sm text-stone-300">adminConfig/flags</code>.</p></header>
      <div className="flex gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/6 p-5 text-sm text-emerald-100/75"><span className="text-emerald-300" aria-hidden="true">✓</span><div><p className="font-bold text-emerald-200">Game integration live</p><p className="mt-1 leading-6"><code>AdminButtonGate.cs</code> reads this flag on each app launch/scene load (not real-time — a toggle here takes effect on a player&apos;s next launch, not instantly mid-session).</p></div></div>
      {loadState === "loading" && <div className="game-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-stone-400" role="status"><span className="size-4 animate-spin rounded-full border-2 border-emerald-300/25 border-t-emerald-300" />Loading current flag state...</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-200" role="alert">{error}</div>}
      {loadState !== "loading" && (
        <div className="game-panel flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2"><span className={`size-2 rounded-full ${showCheatButton ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-stone-600"}`} /><span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{showCheatButton ? "Enabled" : "Disabled"}</span></div><h2 className="text-lg font-bold text-white">Show Cheat button in-game</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">When disabled, the game should hide the Admin/Cheat button for every player.</p></div>
          <button onClick={handleToggle} disabled={saving} className={`relative h-10 w-[4.5rem] shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showCheatButton ? "border-emerald-300/30 bg-emerald-400" : "border-white/10 bg-stone-700"}`} aria-pressed={showCheatButton} aria-label="Show Cheat button in-game"><span className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${showCheatButton ? "translate-x-8" : "translate-x-0"}`} /></button>
        </div>
      )}
      {loadState !== "loading" && (
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
