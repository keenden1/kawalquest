import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getXsollaPackage } from "@/lib/xsolla";
import { createXsollaToken, isXsollaConfigured } from "@/lib/xsollaServer";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (!isXsollaConfigured()) {
    return NextResponse.json({ error: "Real top-ups aren't available yet -- Xsolla approval is still pending." }, { status: 501 });
  }

  const body: unknown = await request.json().catch(() => null);
  const packageId = typeof body === "object" && body !== null && "packageId" in body ? (body as { packageId?: unknown }).packageId : null;
  const selectedPackage = getXsollaPackage(packageId);
  if (!selectedPackage) return NextResponse.json({ error: "Unknown top-up package." }, { status: 400 });

  try {
    const origin = new URL(request.url).origin;
    const { paymentUrl } = await createXsollaToken({
      uid: user.uid,
      email: user.email ?? "",
      sku: selectedPackage.id,
      returnUrl: `${origin}/account/top-up`,
    });
    return NextResponse.json({ paymentUrl });
  } catch (err) {
    console.error("xsolla-token: failed to create token", err);
    return NextResponse.json({ error: "Unable to start the Xsolla checkout right now. Please try again shortly." }, { status: 502 });
  }
}
