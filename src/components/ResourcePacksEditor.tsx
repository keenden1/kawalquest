"use client";
import { useEffect, useState } from "react";
import { validateRelease, type ChapterRelease } from "@/lib/resourcePacks";

type Published = { buildId: string; appVersion: string; publishedAt: string };
async function post(action: string, release: ChapterRelease) {
  const response = await fetch("/api/admin/resource-packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, release }) });
  const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Request failed."); return result;
}
function upload(url: string, file: File, headers: Record<string, string>, progress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = event => { if (event.lengthComputable) progress(event.loaded / event.total); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(Error("Upload failed. Check storage CORS and retry."));
    request.onerror = () => reject(Error("Upload interrupted or blocked by storage CORS. Allow Content-Type, x-amz-meta-sha256 and Cache-Control for your website origin, then retry."));
    request.onabort = () => reject(Error("Upload cancelled."));
    request.send(file);
  });
}
export default function ResourcePacksEditor() {
  const [release, setRelease] = useState<ChapterRelease | null>(null);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false), [uploaded, setUploaded] = useState(false), [published, setPublished] = useState(false);
  const [status, setStatus] = useState(""), [error, setError] = useState("");
  const [releases, setReleases] = useState<Published[]>([]);
  async function refresh() {
    try { const response = await fetch("/api/admin/resource-packs"); const data = await response.json(); if (!response.ok) throw Error(data.error); setReleases(data.releases); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load releases."); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/resource-packs").then(async response => {
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      if (active) setReleases(data.releases);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load releases."); });
    return () => { active = false; };
  }, []);
  async function readManifest(file?: File) {
    setRelease(null); setFiles({}); setUploaded(false); setPublished(false); setError(""); setStatus("");
    if (!file) return;
    try { if (file.size > 20000) throw Error("Manifest is too large."); setRelease(validateRelease(JSON.parse(await file.text()))); }
    catch (e) { setError(e instanceof Error ? e.message : "Invalid release file."); }
  }
  async function uploadPacks() {
    if (!release) return; setBusy(true); setError(""); setStatus(""); setUploaded(false);
    try {
      for (const pack of release.packs) {
        const file = files[pack.id];
        if (!file || file.name !== pack.fileName || file.size !== pack.bytes) throw Error(`Choose the matching ${pack.fileName} from the release folder.`);
      }
      const data = await post("upload", release);
      for (const item of data.uploads as { id: string; uploadUrl: string; headers: Record<string, string> }[]) {
        if (!item.headers?.["x-amz-meta-sha256"]) throw Error("The upload API needs updating. Deploy the latest website changes and refresh this page.");
        await upload(item.uploadUrl, files[item.id], item.headers, fraction => setStatus(`${item.id === "arcs-7-10" ? "Pack 2" : "Pack 1"}: ${Math.round(fraction * 100)}% uploaded`));
      }
      setUploaded(true); setStatus("Both packs uploaded. Publish when ready.");
    } catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!release) return; setBusy(true); setError(""); setStatus("Verifying uploaded packs...");
    try { await post("publish", release); setPublished(true); setStatus("Published. You can now upload the matching APK under Game Controls."); await refresh(); }
    catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "Publish failed."); }
    finally { setBusy(false); }
  }
  const style = "rounded-xl border border-white/15 bg-white/5 p-4";
  return <div className="space-y-5">
    <section className={style}>
      <h2 className="mb-3 text-lg font-semibold">1. Select a Unity release</h2>
      <p className="mb-4 text-sm text-stone-400">Use Kawal Quest → Downloads → Build Android chapter packs in Unity, then select release.json from its output folder. Keep that release’s APK and packs together.</p>
      <label className="block">Release file <input className="mt-2 block" type="file" accept=".json" disabled={busy} onChange={e => void readManifest(e.target.files?.[0])} /></label>
      {release && <p className="mt-3 break-all text-sm text-stone-400">Version {release.appVersion} · Release {release.buildId}</p>}
    </section>
    {release && <section className={style}>
      <h2 className="mb-3 text-lg font-semibold">2. Upload chapter packs</h2>
      {release.packs.map(pack => <label key={pack.id} className="mb-4 block">{pack.id === "arcs-2-6" ? "Pack 1 · Arcs 2–6" : pack.id === "arcs-4-6" ? "Pack 1 · Arcs 4–6 (previous split)" : "Pack 2 · Arcs 7–10"} · {(pack.bytes / 1048576).toFixed(1)} MB
        <input className="mt-2 block max-w-full" type="file" accept=".bundle" disabled={busy || published} onChange={e => {
          const file = e.target.files?.[0]; setFiles(old => { const next = { ...old }; if (file) next[pack.id] = file; else delete next[pack.id]; return next; }); setUploaded(false);
        }} /></label>)}
      <button className="rounded-lg bg-emerald-700 px-4 py-2 disabled:opacity-40" disabled={busy || published || release.packs.some(p => !files[p.id])} onClick={() => void uploadPacks()}>Upload both packs</button>
      <button className="ml-3 rounded-lg bg-amber-500 px-4 py-2 text-black disabled:opacity-40" disabled={busy || !uploaded || published} onClick={() => void publish()}>Publish release</button>
      <p className="mt-3 text-sm text-stone-400">Published releases are kept for existing installations. Changed resources require a new matching APK and release; old packs are not overwritten.</p>
    </section>}
    {status && <p role="status" className="text-emerald-300">{status}</p>}{error && <p role="alert" className="text-red-300">{error}</p>}
    <section className={style}><h2 className="mb-3 text-lg font-semibold">Published releases</h2>
      {releases.length === 0 ? <p className="text-stone-400">No published releases found.</p> : releases.map(r => <p key={r.buildId} className="mb-2 break-all text-sm">{r.appVersion} · {r.buildId} · {r.publishedAt}</p>)}
    </section>
  </div>;
}
