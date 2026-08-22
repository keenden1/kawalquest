import Link from "next/link";

const cards = [
  { href: "/admin/players", badge: "Leaderboard", title: "Player Roster", description: "Inspect adventurers, scores, and join dates synced from Firestore.", icon: "♜", accent: "text-emerald-300 bg-emerald-400/10 border-emerald-300/20" },
  { href: "/admin/shop", badge: "Market", title: "Shop Items", description: "Add and edit the weapons, gear, and collectibles sold on the Shop page.", icon: "⛁", accent: "text-rose-300 bg-rose-400/10 border-rose-300/20" },
  { href: "/admin/remote-config", badge: "Live controls", title: "Game Flags", description: "Control runtime flags and safely stage upcoming game behavior.", icon: "⚑", accent: "text-amber-300 bg-amber-400/10 border-amber-300/20" },
  { href: "/admin/top-up", badge: "Coming soon", title: "Gold Treasury", description: "The future home of player top-ups and transaction history.", icon: "◆", accent: "text-sky-300 bg-sky-400/10 border-sky-300/20" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="game-panel relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-14 -top-20 size-80 rounded-full border border-amber-300/10 bg-amber-300/5" />
        <div className="pointer-events-none absolute -bottom-28 right-20 size-72 rounded-full border border-emerald-300/10" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-3"><span className="eyebrow">Realm Operations</span><span className="h-px w-10 bg-amber-300/35" /></div>
          <h1 className="page-title">Guard the realm.<br /><span className="text-emerald-300">Guide the quest.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">Your command center for Kawal Quest. Monitor the player realm, tune live controls, and keep every adventure running smoothly.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/admin/players" className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-extrabold text-[#172018] shadow-lg shadow-amber-950/20 hover:bg-amber-200">View leaderboard →</Link><Link href="/admin/remote-config" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Manage game flags</Link></div>
        </div>
      </section>

      <section aria-labelledby="operations-heading">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Operations</p><h2 id="operations-heading" className="mt-1 text-2xl font-bold tracking-tight text-white">Choose your station</h2></div><span className="hidden text-xs font-medium text-stone-500 sm:block">4 modules</span></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="quest-card game-panel group rounded-2xl p-5 hover:border-emerald-300/25 hover:shadow-emerald-950/25 sm:p-6">
              <div className="flex items-start justify-between gap-4"><span className={`grid size-12 place-items-center rounded-2xl border text-xl ${card.accent}`}>{card.icon}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">{card.badge}</span></div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-emerald-200">{card.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-stone-400">{card.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/7 pt-4 text-xs font-bold uppercase tracking-wider text-emerald-300">Open station <span className="text-lg transition-transform group-hover:translate-x-1">→</span></div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/6 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 text-emerald-300" aria-hidden="true">✓</span><div><p className="text-sm font-bold text-emerald-100">Role-protected command center</p><p className="mt-1 text-sm text-emerald-100/60">This area requires a verified Firebase session with admin or superadmin access.</p></div></div><span className="shrink-0 rounded-full border border-emerald-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">Access enforced</span></aside>
    </div>
  );
}
