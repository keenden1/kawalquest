import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getR2PublicUrl } from "@/lib/r2";
import { packKey, validBuildId, validateRelease } from "@/lib/resourcePacks";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const build = new URL(request.url).searchParams.get("build");
  if (!validBuildId(build)) return NextResponse.json({ error: "Invalid build." }, { status: 400 });
  try {
    const document = await getAdminDb().collection("chapterReleases").doc(build).get();
    if (!document.exists) return NextResponse.json({ error: "Resources are not published for this build yet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const release = validateRelease(document.data());
    if (release.buildId !== build) throw Error("Release mismatch");
    return NextResponse.json({ ...release, packs: release.packs.map(pack => ({ ...pack, url: getR2PublicUrl(packKey(release, pack)) })) },
      { headers: { "Cache-Control": "public, max-age=300" } });
  } catch { return NextResponse.json({ error: "Resources are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
