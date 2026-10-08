import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

// R2 supports single-PUT objects up to 5GB; cap well under that for an APK.
const MAX_APK_BYTES = 2 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  try {
    const body = await request.json();
    if (body.action === "complete") {
      // Admins can publish verified uploads, but cannot supply an arbitrary URL.
      if (typeof body.key !== "string" || !/^apk\/[0-9a-f-]{36}\/Kawal-Quest\.apk$/.test(body.key)) {
        return NextResponse.json({ error: "Invalid APK upload key." }, { status: 400 });
      }
      const object = await getR2Client().send(new HeadObjectCommand({ Bucket: getR2Bucket(), Key: body.key }));
      if (!object.ContentLength || object.ContentLength > MAX_APK_BYTES) {
        return NextResponse.json({ error: "Uploaded APK is empty or too large." }, { status: 400 });
      }
      const apkDownloadUrl = getR2PublicUrl(body.key);
      await getAdminDb().collection("adminConfig").doc("flags").set({ apkDownloadUrl }, { merge: true });
      return NextResponse.json({ apkDownloadUrl });
    }
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" && body.contentType ? body.contentType : "application/vnd.android.package-archive";
    const size = typeof body.size === "number" ? body.size : 0;

    if (!fileName.toLowerCase().endsWith(".apk")) {
      return NextResponse.json({ error: "File must be an .apk" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_APK_BYTES) {
      return NextResponse.json({ error: "File size must be between 0 and 2GB." }, { status: 400 });
    }

    // Keep builds separate while giving direct downloads a consistent filename.
    const key = `apk/${randomUUID()}/Kawal-Quest.apk`;
    const contentDisposition = 'attachment; filename="Kawal-Quest.apk"';

    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
      ContentDisposition: contentDisposition,
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 });

    // Every signed header must also be sent by the browser on the PUT request.
    return NextResponse.json({ uploadUrl, key, publicUrl: getR2PublicUrl(key), contentType, contentDisposition });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
