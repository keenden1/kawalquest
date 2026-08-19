export default function TopUpPage() {
  return (
    <div className="space-y-7">
      <header className="max-w-3xl"><p className="eyebrow">Economy Operations</p><h1 className="page-title mt-2">Gold treasury</h1><p className="mt-4 text-base leading-7 text-stone-400">A planned workspace for GCash payments through Xsolla and player currency support.</p></header>
      <section className="game-panel relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-3xl text-amber-300">◆</div>
          <span className="mt-6 inline-block rounded-full border border-amber-300/15 bg-amber-300/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Under construction</span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white">The treasury is not open yet</h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">The game does not yet provide Xsolla top-ups, <code className="text-stone-300">gold</code>, or <code className="text-stone-300">topUpHistory</code> data. This station will come online after the Unity-side integration is ready.</p>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">{[["01", "Connect Xsolla"], ["02", "Sync currency"], ["03", "Track history"]].map(([step, label]) => <div key={step} className="rounded-xl border border-white/7 bg-white/3 p-4"><span className="font-mono text-xs font-bold text-emerald-300">{step}</span><p className="mt-2 text-sm font-semibold text-stone-300">{label}</p></div>)}</div>
        </div>
      </section>
    </div>
  );
}
