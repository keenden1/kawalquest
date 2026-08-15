import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/remote-config", label: "Remote Config" },
  { href: "/top-up", label: "Top-Up" },
];

export default function Nav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <span className="font-semibold text-slate-100">Kawal Quest Admin</span>
        <div className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-400 transition-colors hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
