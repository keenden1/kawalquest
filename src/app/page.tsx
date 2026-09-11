import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kawal Quest — Guard the Realm",
  description: "Enter a world of adventure, protect the realm, complete quests, and rise through the Kawal Quest ranks.",
};

const features = [
  { number: "01", icon: "✦", title: "Answer the call", description: "Take on missions that test your courage, choices, and skill across a living island realm." },
  { number: "02", icon: "◇", title: "Grow your legend", description: "Earn quest points, strengthen your standing, and watch your name climb the realm leaderboard." },
  { number: "03", icon: "♜", title: "Guard together", description: "Join a growing community of Kawal and help shape the adventures still to come." },
];

type RankedPlayer = { username: string; points: number };

async function getTopPlayers(): Promise<RankedPlayer[]> {
  try {
    const snapshot = await getAdminDb().collection("players").orderBy("points", "desc").limit(5).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        username: typeof data.username === "string" ? data.username : "Unknown Kawal",
        points: typeof data.points === "number" ? data.points : 0,
      };
    });
  } catch {
    return [];
  }
}

type ApkDownloadConfig = { url: string; enabled: boolean };

async function getApkDownloadConfig(): Promise<ApkDownloadConfig> {
  try {
    const snap = await getAdminDb().collection("adminConfig").doc("flags").get();
    const data = snap.data();
    return {
      url: typeof data?.apkDownloadUrl === "string" ? data.apkDownloadUrl : "",
      enabled: Boolean(data?.apkDownloadEnabled ?? false),
    };
  } catch {
    return { url: "", enabled: false };
  }
}

export default async function PublicLandingPage() {
  const [topPlayers, sessionUser, apkDownload] = await Promise.all([
    getTopPlayers(),
    getSessionUser(),
    getApkDownloadConfig(),
  ]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#050b08] text-stone-100">
      <header className="absolute inset-x-0 top-0 z-40 border-b border-white/8 bg-black/10 backdrop-blur-md">
        <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Kawal Quest home">
            <span className="relative size-11 overflow-hidden rounded-xl border border-amber-200/30 bg-amber-300 shadow-lg shadow-black/30">
              <Image src="/logo.png" alt="" fill sizes="44px" className="object-contain" />
            </span>
            <span><span className="block text-sm font-black tracking-[0.12em] text-white">KAWAL QUEST</span><span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300">Guard the realm</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 md:flex" aria-label="Public navigation">
            <Link href="/game" className="hover:text-amber-300">The game</Link><Link href="/adventure" className="hover:text-amber-300">Adventure</Link><Link href="/leaderboard" className="hover:text-amber-300">Leaderboard</Link><Link href="/shop" className="hover:text-amber-300">Shop</Link>{sessionUser && <><Link href="/inventory" className="hover:text-amber-300">Inventory</Link><Link href="/account" className="hover:text-amber-300">Account</Link></>}
          </nav>
          <div className="flex items-center gap-2">{!sessionUser && <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-stone-200 hover:bg-white/8 sm:inline-flex">Sign in</Link>}<a href="#play" className="hidden rounded-xl border border-amber-200/30 bg-amber-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#172018] hover:bg-amber-200 md:inline-flex">Play now</a><MobileNav signedIn={Boolean(sessionUser)} cta={{ href: "#play", label: "Play now" }} /></div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[760px] lg:min-h-screen">
          <Image src="/kawal-quest-hero.png" alt="A Kawal guardian overlooking a tropical island realm at sunrise" fill priority sizes="100vw" className="object-cover object-[85%_center] lg:object-[68%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050b08] via-[#050b08]/72 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050b08] via-transparent to-black/20" />
          <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-5 pb-16 pt-28 sm:px-8 lg:min-h-screen">
            <div className="max-w-2xl">
              <div className="mb-6 flex items-center gap-3"><span className="h-px w-10 bg-amber-300" /><span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">A new legend awaits</span></div>
              <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.055em] text-white sm:text-7xl lg:text-8xl">Rise as<br />a <span className="text-amber-300">Kawal.</span></h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-stone-300 sm:text-lg sm:leading-8">Explore a realm worth protecting. Complete quests, earn your place among its guardians, and forge a story the islands will remember.</p>
              <div className="mt-9 flex flex-wrap gap-3"><a href="#play" className="rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-black text-[#172018] shadow-xl shadow-black/30 hover:bg-amber-200">Begin your journey →</a><a href="#about" className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/10">Discover the realm</a></div>
              <div className="mt-12 flex flex-wrap gap-6 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500"><span><b className="mr-2 text-emerald-300">●</b>In development</span><span>Adventure RPG</span><span>Built for the community</span></div>
            </div>
          </div>
        </section>

        <section id="about" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div><p className="eyebrow">Welcome to the realm</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl">More than a warrior.<br /><span className="text-emerald-300">You are its guardian.</span></h2></div>
            <div className="border-l border-amber-300/25 pl-6 sm:pl-10"><p className="text-lg leading-8 text-stone-300">In Kawal Quest, every mission leaves a mark. Travel through a tropical fantasy realm shaped by old ruins, brave communities, and dangers stirring beyond the horizon.</p><p className="mt-5 leading-7 text-stone-500">Your journey is just beginning. The world, progression systems, and new adventures will continue to grow alongside the players who answer the call.</p></div>
          </div>
        </section>

        <section id="features" className="border-y border-white/7 bg-[#09130e] py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-12 max-w-xl"><p className="eyebrow">Your adventure</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">Three paths. One purpose.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-white/8 bg-white/8 md:grid-cols-3">
              {features.map((feature) => <article key={feature.number} className="group bg-[#0a1711] p-7 hover:bg-[#0d1d16] sm:p-9"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/8 text-xl text-amber-300">{feature.icon}</span><span className="font-mono text-xs font-bold text-stone-700">{feature.number}</span></div><h3 className="mt-8 text-xl font-black text-white">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-stone-500">{feature.description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="leaderboard" className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-32">
          <div><p className="eyebrow">Hall of Kawal</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white">Legends of<br />the realm.</h2><p className="mt-5 max-w-md leading-7 text-stone-500">The bravest adventurers are already making their mark. Complete quests and earn points to claim your place among them.</p></div>
          <div className="game-panel overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/7 px-6 py-5"><div><p className="text-sm font-black text-white">Top guardians</p><p className="mt-1 text-xs text-stone-600">Live realm rankings</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live</span></div>
            {topPlayers.length > 0 ? <ol className="divide-y divide-white/6">{topPlayers.map((player, index) => <li key={`${player.username}-${index}`} className="flex items-center gap-4 px-6 py-4"><span className={`grid size-9 place-items-center rounded-xl text-xs font-black ${index < 3 ? "bg-amber-300/12 text-amber-300" : "bg-white/4 text-stone-600"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold text-stone-200">{player.username}</span><span className="font-mono text-sm font-bold text-emerald-300">{player.points.toLocaleString()} XP</span></li>)}</ol> : <div className="px-6 py-12 text-center"><span className="text-3xl text-stone-700">♜</span><p className="mt-3 font-bold text-stone-300">The first legend could be you.</p><p className="mt-1 text-sm text-stone-600">Rankings will appear as guardians join the realm.</p></div>}
          </div>
        </section>

        <section id="play" className="px-5 pb-24 sm:px-8 lg:pb-32">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-amber-300/15 bg-gradient-to-br from-[#173525] to-[#09130e] px-6 py-16 text-center sm:px-10 lg:py-20"><div className="absolute left-1/2 top-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" /><div className="relative"><p className="eyebrow">The quest is forming</p><h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Ready when the realm calls?</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-stone-400">Kawal Quest is currently in development. Follow the journey and be among the first guardians to enter.</p>{!apkDownload.enabled ? <span className="mt-8 inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/8 px-6 py-3.5 text-sm font-bold text-amber-200" aria-disabled="true">⚠ Under maintenance</span> : apkDownload.url ? <a href={apkDownload.url} download className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-black text-[#172018] shadow-xl shadow-black/30 hover:bg-amber-200">⬇ Download APK</a> : <span className="mt-8 inline-flex cursor-not-allowed rounded-xl bg-stone-100/10 px-6 py-3.5 text-sm font-bold text-stone-400" aria-disabled="true">Download coming soon</span>}</div></div>
        </section>
      </main>

      <footer className="border-t border-white/7 bg-black/20"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><span className="font-black tracking-wider text-stone-300">KAWAL QUEST</span><span className="ml-3">Guard the realm.</span></div><div className="flex gap-5"><span>In development</span><span>© {new Date().getFullYear()} Kawal Quest</span></div></div></footer>
    </div>
  );
}
