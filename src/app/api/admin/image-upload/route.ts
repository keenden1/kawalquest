import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";
import { getSessionUser, isAdminRole } from "@/lib/auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403 });

  try {
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Image details are required." }, { status: 400 });
    }

    const values = body as Record<string, unknown>;
    const contentType = typeof values.contentType === "string" ? values.contentType : "";
    const size = typeof values.size === "number" ? values.size : 0;
    if (!(contentType in IMAGE_TYPES)) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image size must be between 1 byte and 8 MB." }, { status: 400 });
    }

    const extension = IMAGE_TYPES[contentType as keyof typeof IMAGE_TYPES];
    const key = `images/shop/${Date.now()}-${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });

    return NextResponse.json({
      uploadUrl,
      publicUrl: getR2PublicUrl(key),
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
