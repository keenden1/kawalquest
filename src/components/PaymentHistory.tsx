import "server-only";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getXsollaPackage } from "@/lib/xsolla";

export default async function PaymentHistory({ uid }: { uid: string }) {
  let snapshot;
  try {
    snapshot = await getAdminDb().collection("players").doc(uid).collection("xsollaTopUps").orderBy("createdAt", "desc").limit(50).get();
  } catch {
    return <p role="alert" className="px-5 py-8 text-sm text-amber-200">Payment history could not be loaded. Refresh the page to try again.</p>;
  }
  if (snapshot.empty) return <p className="px-5 py-8 text-center text-sm text-stone-400">No payments recorded yet. Completed purchases appear here after confirmation from Xsolla.</p>;

  return <div className="divide-y divide-white/10">{snapshot.docs.map((document) => {
    const data = document.data();
    const name = typeof data.packageName === "string" ? data.packageName : getXsollaPackage(data.packageId)?.name ?? "Gold purchase";
    const gold = typeof data.gold === "number" ? data.gold.toLocaleString() : "—";
    const date = typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : "Date unavailable";
    const price = typeof data.paidAmount === "string" && typeof data.currency === "string" ? `${data.currency} ${data.paidAmount}` : "Amount unavailable";
    const status = data.status === "refunded" ? "Refunded" : data.status === "refund_pending_reconciliation" ? "Refund recorded · Gold adjustment under review" : data.status === "credited_pending_sync" ? "Paid" : "Payment recorded";
    return <article key={document.id} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:justify-between">
      <div className="min-w-0"><h3 className="font-bold text-white">{name}</h3><p className="mt-1 text-sm text-stone-400">{date} (Philippine time)</p><p className="mt-1 break-all text-xs text-stone-500">Receipt: {document.id}</p></div>
      <div className="sm:text-right"><p className="font-bold text-amber-200">{price}</p><p className="mt-1 text-sm text-stone-300">{gold} Gold</p><p className="mt-1 text-xs text-emerald-200">{status}</p></div>
    </article>;
  })}</div>;
}
