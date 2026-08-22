"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";

const links = [
  { href: "/game", label: "The game" },
  { href: "/adventure", label: "Adventure" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/shop", label: "Shop" },
];

export default function MobileNav({
  active,
  signedIn,
  cta,
}: {
  active?: string;
  signedIn: boolean;
  cta?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const allLinks = signedIn ? [...links, { href: "/inventory", label: "Inventory" }, { href: "/account", label: "Account" }] : links;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-stone-200 hover:bg-white/8"
      >
        <span aria-hidden="true" className="relative block size-4">
          <span className={`absolute left-0 block h-0.5 w-4 bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0.5"}`} />
          <span className={`absolute left-0 top-1.5 block h-0.5 w-4 bg-current transition-opacity ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 block h-0.5 w-4 bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-2.5"}`} />
        </span>
      </button>

      {open && (
        <nav
          id="mobile-nav-menu"
          aria-label="Public navigation"
          className="absolute inset-x-0 top-full border-b border-white/8 bg-[#07110d]/95 px-5 py-4 backdrop-blur-xl"
        >
          {cta && (
            <a
              href={cta.href}
              onClick={() => setOpen(false)}
              className="mb-3 block w-full rounded-xl border border-amber-200/30 bg-amber-300 px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider text-[#172018] hover:bg-amber-200"
            >
              {cta.label}
            </a>
          )}
          <ul className="flex flex-col gap-1">
            {allLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active === link.href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] ${
                    active === link.href ? "text-amber-300" : "text-stone-400 hover:text-amber-300"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-white/8 pt-3">
            {signedIn ? (
              <LogoutButton className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-stone-300 hover:border-red-300/20 hover:bg-red-400/8 hover:text-red-200" />
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider text-stone-200 hover:bg-white/8"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
