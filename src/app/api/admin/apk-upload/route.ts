import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";
import { getSessionUser, isAdminRole } from "@/lib/auth";

// R2 supports single-PUT objects up to 5GB; cap well under that for an APK.
const MAX_APK_BYTES = 2 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  try {
    const body = await request.json();
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" && body.contentType ? body.contentType : "application/vnd.android.package-archive";
    const size = typeof body.size === "number" ? body.size : 0;

    if (!fileName.toLowerCase().endsWith(".apk")) {
      return NextResponse.json({ error: "File must be an .apk" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_APK_BYTES) {
      return NextResponse.json({ error: "File size must be between 0 and 2GB." }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `apk/${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 });

    return NextResponse.json({ uploadUrl, publicUrl: getR2PublicUrl(key), contentType });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
