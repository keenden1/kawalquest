import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getXsollaPackage } from "@/lib/xsolla";
import { verifyXsollaSignature } from "@/lib/xsollaServer";

/**
 * Receives Xsolla Pay Station webhook events. NOT VERIFIED against a real delivery -- no
 * Xsolla account exists yet to send one. Event shape (`notification_type`, `user.id`,
 * `transaction.id`, `purchase.items`) is based on Xsolla's documented webhook payloads as of
 * when this was written; re-check against a real payload (Xsolla Console lets you replay
 * webhook attempts once you have an account) before trusting this in production.
 *
 * Does not touch the player's Unity saveData blob at all (deliberate -- see CLAUDE.md's
 * "Web /inventory shows the real character" section for why editing that from the web is
 * considered too risky). Instead, a successful payment appends to
 * players/{uid}.pendingGoldCredits, which Unity reads, applies to playerData.Gold, and
 * clears the next time the player does a full login (see FirebaseManager.cs).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("authorization");
  if (!verifyXsollaSignature(rawBody, signature)) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Signature check failed." } }, { status: 403 });
  }

  let payload: XsollaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_PAYLOAD", message: "Body was not valid JSON." } }, { status: 400 });
  }

  const db = getAdminDb();
  // Webhooks use a scalar user.id; token creation uses user.id.value.
  const userId = payload.user?.id;
  const rawUid = typeof userId === "object" && userId !== null ? userId.value : userId;
  const uid = typeof rawUid === "string" && rawUid.length > 0 && !rawUid.includes("/")
    ? rawUid
    : undefined;

  switch (payload.notification_type) {
    case "user_validation": {
      if (!uid) return NextResponse.json({ error: { code: "INVALID_USER", message: "No user id provided." } }, { status: 400 });
      const player = await db.collection("players").doc(uid).get();
      if (!player.exists) return NextResponse.json({ error: { code: "INVALID_USER", message: "Unknown player." } }, { status: 400 });
      return NextResponse.json({});
    }

    case "payment": {
      if (!uid) return NextResponse.json({ error: { code: "INVALID_USER", message: "No user id provided." } }, { status: 400 });
      const transactionId = payload.transaction?.id != null ? String(payload.transaction.id) : null;
      const sku = payload.purchase?.virtual_items?.items?.[0]?.sku ?? payload.purchase?.items?.[0]?.sku;
      const selectedPackage = getXsollaPackage(sku);
      if (!transactionId || !selectedPackage) {
        console.error("xsolla webhook: payment event missing transaction id or unrecognized sku", { transactionId, sku });
        return NextResponse.json({ error: { code: "INVALID_PAYLOAD", message: "Missing transaction id or unrecognized item." } }, { status: 400 });
      }

      const playerRef = db.collection("players").doc(uid);
      const receiptRef = playerRef.collection("xsollaTopUps").doc(transactionId);
      await db.runTransaction(async (transaction) => {
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) return; // already credited -- Xsolla retries webhooks on non-200s

        transaction.set(
          playerRef,
          {
            pendingGoldCredits: FieldValue.arrayUnion({
              receiptId: transactionId,
              gold: selectedPackage.gold,
              packageId: selectedPackage.id,
              creditedAt: new Date().toISOString(),
            }),
          },
          { merge: true }
        );
        transaction.create(receiptRef, {
          packageId: selectedPackage.id,
          gold: selectedPackage.gold,
          status: "credited_pending_sync",
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      return NextResponse.json({});
    }

    case "refund": {
      // Deliberately conservative: only reverses a credit that Unity hasn't picked up yet.
      // If it's already been applied to the player's live Gold, that Gold may well have
      // already been spent in-game -- safely clawing it back would need to touch saveData,
      // which this project has already decided the web should never do. Logged instead for
      // manual reconciliation in that case.
      if (!uid) return NextResponse.json({});
      const transactionId = payload.transaction?.id != null ? String(payload.transaction.id) : null;
      if (!transactionId) return NextResponse.json({});

      const playerRef = db.collection("players").doc(uid);
      const receiptRef = playerRef.collection("xsollaTopUps").doc(transactionId);
      const receipt = await receiptRef.get();
      if (receipt.exists && receipt.data()?.status === "credited_pending_sync") {
        const player = await playerRef.get();
        const pending: Array<{ receiptId: string }> = player.data()?.pendingGoldCredits ?? [];
        const stillPending = pending.find((entry) => entry.receiptId === transactionId);
        if (stillPending) {
          await playerRef.update({ pendingGoldCredits: FieldValue.arrayRemove(stillPending) });
          await receiptRef.update({ status: "refunded" });
        } else {
          console.warn(`xsolla webhook: refund for ${transactionId} but credit already synced to Unity -- needs manual reconciliation for uid ${uid}`);
        }
      }
      return NextResponse.json({});
    }

    default:
      return NextResponse.json({});
  }
}

type XsollaWebhookPayload = {
  notification_type?: string;
  user?: { id?: string | { value?: string } };
  transaction?: { id?: string | number };
  purchase?: {
    virtual_items?: { items?: Array<{ sku?: string }> };
    items?: Array<{ sku?: string }>;
  };
};
