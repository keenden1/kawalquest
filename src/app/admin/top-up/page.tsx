import AdminPaymentHistory, { type AdminPaymentRow } from "@/components/AdminPaymentHistory";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getXsollaPackage } from "@/lib/xsolla";

export const dynamic = "force-dynamic";

const MAX_RECEIPTS_PER_PLAYER = 50;
const MAX_ADMIN_RECEIPTS = 500;

async function fetchPaymentHistory(): Promise<{ payments: AdminPaymentRow[]; error: string | null }> {
  try {
    const playersSnapshot = await getAdminDb().collection("players").get();
    const receiptSnapshots = await Promise.all(
      playersSnapshot.docs.map((player) =>
        player.ref.collection("xsollaTopUps").orderBy("createdAt", "desc").limit(MAX_RECEIPTS_PER_PLAYER).get()
      )
    );

    const payments = receiptSnapshots.flatMap((snapshot, playerIndex) => {
      const playerDocument = playersSnapshot.docs[playerIndex];
      const player = playerDocument.data();
      const playerName = typeof player.username === "string" && player.username.trim() ? player.username : "Unnamed player";
      const playerEmail = typeof player.email === "string" ? player.email : "";

      return snapshot.docs.map((receipt): AdminPaymentRow => {
        const data = receipt.data();
        const packageName = typeof data.packageName === "string"
          ? data.packageName
          : getXsollaPackage(data.packageId)?.name ?? "Gold purchase";
        return {
          id: receipt.id,
          uid: playerDocument.id,
          playerName,
          playerEmail,
          packageName,
          gold: typeof data.gold === "number" ? data.gold : null,
          paidAmount: typeof data.paidAmount === "string" ? data.paidAmount : null,
          currency: typeof data.currency === "string" ? data.currency : null,
          status: typeof data.status === "string" ? data.status : "recorded",
          createdAt: typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : null,
        };
      });
    });

    payments.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return { payments: payments.slice(0, MAX_ADMIN_RECEIPTS), error: null };
  } catch (error) {
    console.error("Unable to load admin payment history", error);
    return { payments: [], error: "Payment history could not be loaded. Refresh the page to try again." };
  }
}

export default async function TopUpPage() {
  const { payments, error } = await fetchPaymentHistory();
  const paidCount = payments.filter((payment) => payment.status === "credited_pending_sync").length;
  const refundedCount = payments.filter((payment) => payment.status === "refunded").length;
  const reviewCount = payments.filter((payment) => payment.status === "refund_pending_reconciliation").length;

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="eyebrow">Economy Operations</p>
        <h1 className="page-title mt-2">Xsolla payment history</h1>
        <p className="mt-4 text-base leading-7 text-stone-400">Review confirmed player purchases, refunds, Gold amounts, and receipts. New webhook confirmations appear here automatically.</p>
      </header>

      {!error && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Recorded payments", payments.length.toLocaleString(), "Latest confirmed receipts"],
            ["Paid", paidCount.toLocaleString(), "Gold credit recorded"],
            ["Refunded", refundedCount.toLocaleString(), "Credit reversed before sync"],
            ["Needs review", reviewCount.toLocaleString(), "Manual Gold reconciliation"],
          ].map(([label, value, note]) => (
            <div key={label} className="game-panel rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
              <p className="mt-1 text-xs text-emerald-300/70">{note}</p>
            </div>
          ))}
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-200" role="alert">{error}</div>
      ) : (
        <AdminPaymentHistory payments={payments} />
      )}
    </div>
  );
}
