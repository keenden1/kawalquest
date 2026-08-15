import Link from "next/link";

const cards = [
  {
    href: "/players",
    title: "Players",
    description: "View the leaderboard and player list synced from Firestore.",
  },
  {
    href: "/remote-config",
    title: "Remote Config",
    description: "Toggle remote flags read by the game, like the Cheat button visibility.",
  },
  {
    href: "/top-up",
    title: "Top-Up",
    description: "Manage in-game currency purchases (not yet implemented in-game).",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Kawal Quest Admin</h1>
        <p className="mt-1 text-slate-400">
          Local admin dashboard for the game&apos;s Firebase project. No login is
          enforced yet &mdash; do not deploy this publicly without adding auth first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-slate-800 bg-slate-950 p-5 transition-colors hover:border-slate-600"
          >
            <h2 className="font-medium text-slate-100">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
