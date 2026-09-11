import Link from "next/link";
import { redirect } from "next/navigation";
import XsollaTopUp from "@/components/XsollaTopUp";
import { getSessionUser } from "@/lib/auth";
import { isXsollaConfigured } from "@/lib/xsollaServer";

export default async function AccountTopUpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const xsollaConfigured = isXsollaConfigured();

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/account" className="text-sm font-bold text-stone-400 hover:text-white">← Back to account</Link>
        </header>

        <div className="mt-14 max-w-2xl">
          <p className="eyebrow">Realm treasury</p>
          <h1 className="page-title mt-3">Top up Gold</h1>
          <p className="mt-4 leading-7 text-stone-400">Buy Gold to spend in the Shop. Purchases go through Xsolla (GCash and more).</p>
        </div>

        <div className="mt-9">
          <XsollaTopUp configured={xsollaConfigured} />
        </div>
      </div>
    </main>
  );
}
