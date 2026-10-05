export type ChapterPack = { id: string; fileName: string; bytes: number; sha256: string; scenes: string[] };
export type ChapterRelease = { schema: 1 | 2; buildId: string; platform: "Android"; appVersion: string; packs: ChapterPack[] };
export const validBuildId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
export const packKey = (release: ChapterRelease, pack: ChapterPack) => `chapters/${release.buildId}/${pack.sha256}.bundle`;

export function validateRelease(input: unknown): ChapterRelease {
  if (!input || typeof input !== "object") throw Error("Select the release.json produced by Unity.");
  const raw = input as Record<string, unknown>;
  if ((raw.schema !== 1 && raw.schema !== 2) || raw.platform !== "Android" || !validBuildId(raw.buildId) ||
      typeof raw.appVersion !== "string" || !raw.appVersion.trim() || raw.appVersion.length > 80 ||
      !Array.isArray(raw.packs) || raw.packs.length !== 2) throw Error("Invalid Android release manifest.");
  const seen = new Set<string>();
  // Keep existing 3/3/4 installations working; new releases use Arc 1 + 2–6 + 7–10.
  const firstPack = raw.schema === 2 ? "arcs-2-6" : "arcs-4-6";
  const packs: ChapterPack[] = raw.packs.map((value: unknown) => {
    if (!value || typeof value !== "object") throw Error("Invalid resource pack.");
    const p = value as Record<string, unknown>;
    if (typeof p.id !== "string" || (p.id !== firstPack && p.id !== "arcs-7-10") || seen.has(p.id)) throw Error("Include exactly Pack 1 and Pack 2 for this release format.");
    seen.add(p.id);
    if (p.fileName !== `${p.id}.bundle` || typeof p.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(p.sha256) ||
        typeof p.bytes !== "number" || !Number.isSafeInteger(p.bytes) || p.bytes < 1 || p.bytes > 2 * 1024 ** 3 || !Array.isArray(p.scenes))
      throw Error("Invalid pack size, filename or checksum.");
    const packId = p.id as string;
    const first = packId === firstPack ? (raw.schema === 2 ? 2 : 4) : 7, last = packId === firstPack ? 6 : 10;
    const levels = new Set<string>();
    for (const scene of p.scenes) {
      if (typeof scene !== "string" || scene.length > 200 || scene.includes("..") || scene.includes("\\") || !scene.startsWith("Assets/")) throw Error("Invalid scene path.");
      const match = /\/(\d+)-([123])(?:\(1\))?\.unity$/.exec(scene);
      if (!match || Number(match[1]) < first || Number(match[1]) > last || levels.has(`${match[1]}-${match[2]}`)) throw Error("Scene is outside this pack or duplicated.");
      levels.add(`${match[1]}-${match[2]}`);
    }
    if (levels.size !== (last - first + 1) * 3) throw Error("Pack must include all three levels of each arc.");
    return { id: packId, fileName: p.fileName as string, bytes: p.bytes, sha256: p.sha256, scenes: p.scenes as string[] };
  });
  return { schema: raw.schema, buildId: raw.buildId, platform: "Android", appVersion: raw.appVersion, packs: packs.sort((a, b) => a.id.localeCompare(b.id)) };
}
export type PackUploadStatus = { id: string; fileName: string; expectedBytes: number; storedBytes?: number; state: "ready" | "missing" | "size-mismatch" | "metadata-mismatch" | "unavailable" };
export type UploadedRelease = { release: ChapterRelease; updatedAt: string; packs: PackUploadStatus[] };
