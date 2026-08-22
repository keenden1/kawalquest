import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import MobileNav from "@/components/MobileNav";
import { getSessionUser, type SessionUser } from "@/lib/auth";

const links = [
  { href: "/game", label: "The game" },
  { href: "/adventure", label: "Adventure" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/shop", label: "Shop" },
];

export default async function PublicHeader({ active, user }: { active?: string; user?: SessionUser }) {
  const sessionUser = user ?? await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07110d]/90 backdrop-blur-xl">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Kawal Quest home">
          <span className="relative size-11 overflow-hidden rounded-xl border border-amber-200/30 bg-amber-300 shadow-lg shadow-black/30 transition-transform group-hover:rotate-3">
            <Image src="/logo.png" alt="" fill sizes="44px" className="object-contain" />
          </span>
          <span className="hidden sm:block"><span className="block text-sm font-black tracking-[0.12em] text-white">KAWAL QUEST</span><span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300">Guard the realm</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-[0.12em] md:flex" aria-label="Public navigation">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={active === link.href ? "page" : undefined} className={active === link.href ? "text-amber-300" : "text-stone-400 hover:text-amber-300"}>{link.label}</Link>)}
          {sessionUser && <Link href="/inventory" aria-current={active === "/inventory" ? "page" : undefined} className={active === "/inventory" ? "text-amber-300" : "text-stone-400 hover:text-amber-300"}>Inventory</Link>}
          {sessionUser && <Link href="/account" aria-current={active === "/account" ? "page" : undefined} className={active === "/account" ? "text-amber-300" : "text-stone-400 hover:text-amber-300"}>Account</Link>}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {sessionUser ? <LogoutButton className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-stone-300 hover:border-red-300/20 hover:bg-red-400/8 hover:text-red-200" /> : <Link href="/login" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-stone-200 hover:bg-white/8">Sign in</Link>}
        </div>
        <MobileNav active={active} signedIn={Boolean(sessionUser)} />
      </div>
    </header>
  );
}
