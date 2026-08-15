export default function TopUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Top-Up</h1>
        <p className="mt-1 text-slate-400">
          In-game currency purchases (GCash via Xsolla), planned but not yet built.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
        <p>
          The game doesn&apos;t have Xsolla top-up integration yet &mdash; there&apos;s no{" "}
          <code className="text-slate-300">gold</code> or{" "}
          <code className="text-slate-300">topUpHistory</code> data in Firestore to manage
          here. This page is a placeholder until that&apos;s implemented on the game side (see
          the Xsolla checklist in the Unity project&apos;s CLAUDE.md).
        </p>
      </div>
    </div>
  );
}
