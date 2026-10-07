import { NextResponse } from "next/server";
import { HeadObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getR2Bucket, getR2Client, R2ConfigurationError } from "@/lib/r2";
import { packKey, validateRelease, type ChapterRelease, type PackUploadStatus } from "@/lib/resourcePacks";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function packStatus(release: ChapterRelease): Promise<PackUploadStatus[]> {
  return Promise.all(release.packs.map(async pack => {
    const base = { id: pack.id, fileName: pack.fileName, expectedBytes: pack.bytes };
    try {
      const object = await getR2Client().send(new HeadObjectCommand({ Bucket: getR2Bucket(), Key: packKey(release, pack) }));
      return { ...base, storedBytes: object.ContentLength,
        state: object.ContentLength !== pack.bytes ? "size-mismatch" : object.Metadata?.sha256 !== pack.sha256 ? "metadata-mismatch" : "ready" };
    } catch (error) {
      const detail = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      return { ...base, state: detail?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey"].includes(detail?.name ?? "") ? "missing" : "unavailable" };
    }
  }));
}
async function authorize() {
  const user = await getSessionUser();
  return !user ? NextResponse.json({ error: "Authentication required." }, { status: 401, headers })
    : user.role !== "superadmin" ? NextResponse.json({ error: "Superadmin role required." }, { status: 403, headers }) : null;
}
export async function GET() {
  const denied = await authorize(); if (denied) return denied;
  try {
    const db = getAdminDb();
    const [result, saved] = await Promise.all([
      db.collection("chapterReleases").orderBy("publishedAt", "desc").limit(20).get(),
      db.collection("chapterReleaseDrafts").orderBy("updatedAt", "desc").limit(20).get(),
    ]);
    const drafts = (await Promise.all(saved.docs.map(async d => {
      if ((await db.collection("chapterReleases").doc(d.id).get()).exists) return null;
      const release = validateRelease(d.data().release);
      return { release, updatedAt: d.data().updatedAt, packs: await packStatus(release) };
    }))).filter(d => d !== null);
    const known = new Set([...result.docs.map(d => d.id), ...saved.docs.map(d => d.id)]);
    let storageOnly: string[] = [], storageWarning = "";
    try {
      const objects = await getR2Client().send(new ListObjectsV2Command({ Bucket: getR2Bucket(), Prefix: "chapters/", Delimiter: "/", MaxKeys: 100 }));
      const candidates = (objects.CommonPrefixes ?? []).map(p => /^chapters\/([a-f0-9]{32})\/$/.exec(p.Prefix ?? "")?.[1]).filter((id): id is string => !!id && !known.has(id));
      storageOnly = (await Promise.all(candidates.map(async id => (await db.collection("chapterReleases").doc(id).get()).exists ? null : id))).filter((id): id is string => id !== null);
      if (objects.IsTruncated) storageWarning = "Showing the first 100 storage folders. Select a matching release.json to open another release.";
    } catch { storageWarning = "Could not scan storage for older uploads. Saved releases are shown below; check storage access and refresh."; }
    return NextResponse.json({ releases: result.docs.map(d => ({ buildId: d.id, appVersion: d.data().appVersion, publishedAt: d.data().publishedAt })), drafts, storageOnly, storageWarning }, { headers });
  } catch { return NextResponse.json({ error: "Could not load releases." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  const denied = await authorize(); if (denied) return denied;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "JSON required." }, { status: 415, headers });
  const raw = await request.text();
  if (raw.length > 20000) return NextResponse.json({ error: "Manifest too large." }, { status: 413, headers });
  let release, action;
  try { const body = JSON.parse(raw); release = validateRelease(body.release); action = body.action; }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid manifest." }, { status: 400, headers }); }
  if (action !== "upload" && action !== "publish" && action !== "inspect") return NextResponse.json({ error: "Invalid action." }, { status: 400, headers });
  let stage = "release lookup";
  try {
    const ref = getAdminDb().collection("chapterReleases").doc(release.buildId);
    if ((await ref.get()).exists) return NextResponse.json({ error: "This release is already published. Build a new release for changes." }, { status: 409, headers });
    if (action === "inspect" || action === "upload") {
      stage = "draft registration";
      const draft = getAdminDb().collection("chapterReleaseDrafts").doc(release.buildId);
      const savedDraft = await draft.get();
      if (savedDraft.exists && JSON.stringify(validateRelease(savedDraft.data()?.release)) !== JSON.stringify(release))
        return NextResponse.json({ error: "This build ID already has a different release.json. Use its original manifest, or build a new release for changed resources." }, { status: 409, headers });
      // Register before uploading so a closed tab or interrupted PUT remains recoverable.
      await draft.set({ release, updatedAt: new Date().toISOString() });
      if (action === "inspect") return NextResponse.json({ release, packs: await packStatus(release) }, { headers });
    }
    if (action === "upload") {
      stage = "upload preparation";
      const uploads = await Promise.all(release.packs.map(async pack => ({
        id: pack.id, fileName: pack.fileName,
        headers: { "Content-Type": "application/octet-stream", "x-amz-meta-sha256": pack.sha256,
          "Cache-Control": "public, max-age=31536000, immutable" },
        uploadUrl: await getSignedUrl(getR2Client(), new PutObjectCommand({ Bucket: getR2Bucket(), Key: packKey(release, pack),
          ContentType: "application/octet-stream", ContentLength: pack.bytes, CacheControl: "public, max-age=31536000, immutable",
          Metadata: { sha256: pack.sha256 },
        }), { expiresIn: 3600, unhoistableHeaders: new Set(["x-amz-meta-sha256"]),
          signableHeaders: new Set(["content-type", "cache-control"]) }),
      })));
      return NextResponse.json({ uploads }, { headers });
    }
    // Verify every object before making the manifest public. A client also verifies
    // SHA-256 against its APK-pinned catalog before accepting downloaded bytes.
    stage = "storage verification";
    for (const pack of release.packs) {
      const object = await getR2Client().send(new HeadObjectCommand({ Bucket: getR2Bucket(), Key: packKey(release, pack) }));
      if (object.ContentLength !== pack.bytes)
        return NextResponse.json({ error: `${pack.fileName}: stored size is ${object.ContentLength ?? "unknown"} bytes; expected ${pack.bytes} bytes. Upload the matching file from this release folder again.`, code: "PACK_SIZE_MISMATCH" }, { status: 400, headers });
      if (object.Metadata?.sha256 !== pack.sha256)
        return NextResponse.json({ error: `${pack.fileName}: SHA-256 upload metadata is ${object.Metadata?.sha256 ? "different from this release" : "missing"}. Refresh the updated admin page and upload both files again. Allow x-amz-meta-sha256 and Cache-Control in the bucket CORS policy.`, code: "PACK_METADATA_MISMATCH" }, { status: 400, headers });
    }
    // create() prevents two admins from overwriting the same release in a race.
    stage = "release publication";
    await ref.create({ ...release, publishedAt: new Date().toISOString() });
    return NextResponse.json({ buildId: release.buildId, published: true }, { headers });
  } catch (error) {
    if (error instanceof R2ConfigurationError)
      return NextResponse.json({ error: error.message, code: "R2_CONFIGURATION" }, { status: 503, headers });
    const details = error as { name?: string; code?: unknown; $metadata?: { httpStatusCode?: number } } | null;
    const providerCode = String(details?.code ?? details?.name ?? "Unknown");
    // Do not log raw exceptions: SDK errors can contain credentials or signed URLs.
    console.error("Resource pack operation failed", { stage, buildId: release.buildId,
      code: /^[a-zA-Z0-9_-]{1,80}$/.test(providerCode) ? providerCode : "Unknown",
      status: details?.$metadata?.httpStatusCode });
    let message = `Could not complete ${stage}. Check the website server logs for this release.`;
    let status = 503;
    if (stage === "release lookup" || stage === "release publication" || stage === "draft registration") {
      message = `Could not complete ${stage} in the game database. Check the website's server database access.`;
      if (stage === "release publication" && (details?.code === 6 || details?.code === "already-exists")) {
        message = "This release is already published. Refresh the page to see it."; status = 409;
      }
    } else if (details?.$metadata?.httpStatusCode === 403 || ["AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"].includes(providerCode)) {
      message = "Storage rejected access. Check the R2 Access Key ID and Secret Access Key, and grant Object Read & Write for the configured bucket. Redeploy after changing website settings.";
    } else if (stage === "storage verification" && (details?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey", "NoSuchBucket"].includes(providerCode))) {
      message = "A resource pack or its bucket was not found. Check R2_BUCKET_NAME and upload both packs before publishing.";
    }
    return NextResponse.json({ error: message, code: stage.toUpperCase().replaceAll(" ", "_") }, { status, headers });
  }
}
