"use client";
import { useEffect, useState } from "react";
import { validateRelease, type ChapterRelease, type UploadedRelease, type PackUploadStatus } from "@/lib/resourcePacks";

type Published = { buildId: string; appVersion: string; publishedAt: string };
const packLabels: Record<PackUploadStatus["state"], string> = { ready: "Uploaded - ready", missing: "Not uploaded", "size-mismatch": "Incomplete / wrong size", "metadata-mismatch": "Needs replacement - hash metadata mismatch", unavailable: "Storage check unavailable" };
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
  const [drafts, setDrafts] = useState<UploadedRelease[]>([]), [storageOnly, setStorageOnly] = useState<string[]>([]);
  const [storageWarning, setStorageWarning] = useState(""), [loading, setLoading] = useState(true);
  const [fileSelection, setFileSelection] = useState(0);
  function applyList(data: { releases: Published[]; drafts?: UploadedRelease[]; storageOnly?: string[]; storageWarning?: string }) {
    setReleases(data.releases); setDrafts(data.drafts ?? []); setStorageOnly(data.storageOnly ?? []); setStorageWarning(data.storageWarning ?? "");
  }
  async function refresh() {
    setLoading(true);
    try { const response = await fetch("/api/admin/resource-packs"); const data = await response.json(); if (!response.ok) throw Error(data.error); applyList(data); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load releases."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/resource-packs").then(async response => {
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      if (active) applyList(data);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load releases."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function readManifest(file?: File, expectedBuild?: string) {
    setRelease(null); setFiles({}); setUploaded(false); setPublished(false); setError(""); setStatus("");
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 20000) throw Error("Manifest is too large.");
      const selected = validateRelease(JSON.parse(await file.text()));
      if (expectedBuild && selected.buildId !== expectedBuild) throw Error("This release.json belongs to a different release. Select the matching file for this storage folder.");
      const result = await post("inspect", selected);
      setRelease(selected); setFileSelection(value => value + 1);
      setUploaded((result.packs as PackUploadStatus[]).every(p => p.state === "ready"));
      setStatus("Release saved. Existing uploads have been checked."); await refresh();
    }
    catch (e) { setError(e instanceof Error ? e.message : "Invalid release file."); }
    finally { setBusy(false); }
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
      const checked = await post("inspect", release);
      const ready = (checked.packs as PackUploadStatus[]).every(p => p.state === "ready");
      setUploaded(ready); setStatus(ready ? "Both packs verified. Publish now or return later." : "Upload finished, but some files need attention. See their status below.");
    } catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { await refresh(); setBusy(false); }
  }
  async function publish(target: ChapterRelease | null = release) {
    if (!target) return; setBusy(true); setError(""); setStatus("Verifying uploaded packs...");
    try { await post("publish", target); if (release?.buildId === target.buildId) setPublished(true); setStatus("Published. You can now upload the matching APK under Game Controls."); }
    catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "Publish failed."); }
    finally { await refresh(); setBusy(false); }
  }
  function replace(draft: UploadedRelease) {
    setRelease(draft.release); setFiles({}); setUploaded(false); setPublished(false); setError("");
    setFileSelection(value => value + 1); setStatus("Choose the matching bundle files above, then upload to replace this unpublished release's files.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const style = "rounded-xl border border-white/15 bg-white/5 p-4";
  return <div className="space-y-5">
    <section className={style}>
      <h2 className="mb-3 text-lg font-semibold">1. Select a Unity release</h2>
      <p className="mb-4 text-sm text-stone-400">Use Kawal Quest → Downloads → Build Android chapter packs in Unity, then select release.json from its output folder. Keep that release’s APK and packs together.</p>
      <label className="block">Release file <input className="mt-2 block" type="file" accept=".json" disabled={busy} onChange={e => void readManifest(e.target.files?.[0])} /></label>
      {release && <p className="mt-3 break-all text-sm text-stone-400">Version {release.appVersion} · Release {release.buildId}</p>}
    </section>
    {release && <section id="chapter-pack-upload" className={style}>
      <h2 className="mb-3 text-lg font-semibold">2. Upload chapter packs</h2>
      {release.packs.map(pack => <label key={pack.id} className="mb-4 block">{pack.id === "arcs-2-6" ? "Pack 1 · Arcs 2–6" : pack.id === "arcs-4-6" ? "Pack 1 · Arcs 4–6 (previous split)" : "Pack 2 · Arcs 7–10"} · {(pack.bytes / 1048576).toFixed(1)} MB
        <input key={`${release.buildId}-${fileSelection}-${pack.id}`} className="mt-2 block max-w-full" type="file" accept=".bundle" disabled={busy || published} onChange={e => {
          const file = e.target.files?.[0]; setFiles(old => { const next = { ...old }; if (file) next[pack.id] = file; else delete next[pack.id]; return next; }); setUploaded(false);
        }} /></label>)}
      <button className="rounded-lg bg-emerald-700 px-4 py-2 disabled:opacity-40" disabled={busy || published || release.packs.some(p => !files[p.id])} onClick={() => void uploadPacks()}>Upload both packs</button>
      <button className="ml-3 rounded-lg bg-amber-500 px-4 py-2 text-black disabled:opacity-40" disabled={busy || !uploaded || published} onClick={() => void publish()}>Publish release</button>
      <p className="mt-3 text-sm text-stone-400">Published releases are kept for existing installations. Changed resources require a new matching APK and release; old packs are not overwritten.</p>
    </section>}
    {status && <p role="status" className="text-emerald-300">{status}</p>}{error && <p role="alert" className="text-red-300">{error}</p>}
    <section className={style}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Uploaded releases</h2>
        <button className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40" disabled={busy || loading} onClick={() => void refresh()}>{loading ? "Checking storage..." : "Refresh uploads"}</button>
      </div>
      <p className="mb-4 text-sm text-stone-400">Uploads stay here when you close this page. Publish when both packs are ready, or replace files for an unpublished release.</p>
      {storageWarning && <p className="mb-3 text-sm text-amber-300">{storageWarning}</p>}
      {!loading && drafts.length === 0 && storageOnly.length === 0 && <p className="text-stone-400">No unpublished uploads found.</p>}
      {drafts.map(draft => {
        const ready = draft.packs.every(p => p.state === "ready");
        return <article key={draft.release.buildId} className="mb-3 rounded-xl border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Version {draft.release.appVersion}</h3><span className={ready ? "text-emerald-300" : "text-amber-300"}>{ready ? "Ready to publish" : "Upload needs attention"}</span></div>
          <p className="mt-1 break-all text-xs text-stone-400">Release {draft.release.buildId}</p>
          <ul className="my-3 space-y-2 text-sm">{draft.packs.map(pack => <li key={pack.id} className="flex flex-wrap justify-between gap-2"><span>{pack.fileName} · {(pack.expectedBytes / 1048576).toFixed(1)} MiB</span><span className={pack.state === "ready" ? "text-emerald-300" : "text-amber-300"}>{packLabels[pack.state]}</span></li>)}</ul>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-amber-500 px-4 py-2 text-black disabled:opacity-40" disabled={busy || loading || !ready} onClick={() => void publish(draft.release)}>Publish release</button>
            <button className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-40" disabled={busy || loading} onClick={() => replace(draft)}>Replace files</button>
          </div>
        </article>;
      })}
      {storageOnly.map(id => <article key={id} className="mb-3 rounded-xl border border-white/10 p-4">
        <h3 className="font-semibold">Existing upload found</h3><p className="my-2 break-all text-xs text-stone-400">Release {id}</p>
        <p className="mb-3 text-sm text-stone-400">Select the matching release.json once to check these files and enable publishing or replacement.</p>
        <label className="text-sm">Link release.json <input className="mt-2 block max-w-full" type="file" accept=".json" disabled={busy} onChange={e => void readManifest(e.target.files?.[0], id)} /></label>
      </article>)}
    </section>
    <section className={style}><h2 className="mb-3 text-lg font-semibold">Published releases</h2>
      {releases.length === 0 ? <p className="text-stone-400">No published releases found.</p> : releases.map(r => <p key={r.buildId} className="mb-2 break-all text-sm">{r.appVersion} · {r.buildId} · {r.publishedAt}</p>)}
    </section>
  </div>;
}
