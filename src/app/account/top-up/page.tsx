import Link from "next/link";
import { redirect } from "next/navigation";
import MockTopUp from "@/components/MockTopUp";
import { getSessionUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export default async function AccountTopUpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const snapshot = await getAdminDb().collection("players").doc(user.uid).get();
  const balance = typeof snapshot.data()?.mockGold === "number" ? snapshot.data()!.mockGold : 0;
  return <main className="min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between"><Link href="/account" className="text-sm font-bold text-stone-400 hover:text-white">← Back to account</Link><span className="rounded-full border border-red-300/15 bg-red-300/7 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200">Mock mode</span></header><div className="mt-14 max-w-2xl"><p className="eyebrow">Test treasury</p><h1 className="page-title mt-3">Top up mock gold</h1><p className="mt-4 leading-7 text-stone-400">Choose a test package to validate the wallet experience before Xsolla and GCash are connected.</p></div><div className="mt-9"><MockTopUp initialBalance={balance} /></div></div></main>;
}
