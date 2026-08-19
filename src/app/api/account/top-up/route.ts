import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getSessionUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getMockTopUpPackage } from "@/lib/mockTopUp";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body: unknown = await request.json();
    const packageId = typeof body === "object" && body !== null && "packageId" in body ? (body as { packageId?: unknown }).packageId : null;
    const requestId = typeof body === "object" && body !== null && "requestId" in body ? (body as { requestId?: unknown }).requestId : null;
    const selectedPackage = getMockTopUpPackage(packageId);
    if (!selectedPackage || typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) return NextResponse.json({ error: "Invalid mock top-up request." }, { status: 400 });

    const db = getAdminDb();
    const playerRef = db.collection("players").doc(user.uid);
    const receiptRef = playerRef.collection("mockTopUps").doc(requestId);
    const result = await db.runTransaction(async (transaction) => {
      const receipt = await transaction.get(receiptRef);
      if (receipt.exists) return { balance: Number(receipt.data()?.balanceAfter ?? 0), duplicate: true };

      const player = await transaction.get(playerRef);
      const currentBalance = player.exists && typeof player.data()?.mockGold === "number" ? player.data()!.mockGold : 0;
      const balance = currentBalance + selectedPackage.gold;
      transaction.set(playerRef, { mockGold: balance, username: player.data()?.username ?? user.name ?? user.email?.split("@")[0] ?? "Kawal", email: user.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.create(receiptRef, { mode: "mock", provider: "none", packageId: selectedPackage.id, packageName: selectedPackage.name, displayPrice: selectedPackage.displayPrice, gold: selectedPackage.gold, balanceAfter: balance, status: "completed", createdAt: FieldValue.serverTimestamp() });
      return { balance, duplicate: false };
    });
    return NextResponse.json({ ...result, package: selectedPackage, message: "Mock gold added. No payment was processed." });
  } catch {
    return NextResponse.json({ error: "Unable to complete the mock top-up." }, { status: 500 });
  }
}
