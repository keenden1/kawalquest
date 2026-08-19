import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUser, isAdminRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In", description: "Sign in to your Kawal Quest account." };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(isAdminRole(user.role) ? "/admin" : "/account");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.14),transparent_35rem)]" />
      <Link href="/" className="absolute left-5 top-6 z-10 flex items-center gap-3 text-sm font-bold text-stone-400 hover:text-white sm:left-8"><span className="grid size-9 place-items-center rounded-xl bg-amber-300 text-xs font-black text-[#172018]">KQ</span>Back to the realm</Link>
      <div className="relative z-10"><AuthForm /></div>
    </main>
  );
}
