"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import type { Role } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Overview", glyph: "⌂" },
  { href: "/admin/players", label: "Players", glyph: "♜" },
  { href: "/admin/shop", label: "Shop", glyph: "⛁" },
  { href: "/admin/remote-config", label: "Game Controls", glyph: "⚑" },
  { href: "/admin/resource-packs", label: "Resource Packs", glyph: "↓" },
  { href: "/admin/top-up", label: "Top-Up", glyph: "◆" },
];

export default function Nav({ role, email }: { role: Role; email: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleLinks = role === "superadmin" ? [...links, { href: "/admin/users", label: "Roles", glyph: "♛" }] : links;

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07110d]/88 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/admin" className="group flex min-w-0 items-center gap-3" aria-label="Kawal Quest admin overview">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-amber-300/25 bg-amber-300 shadow-lg shadow-amber-950/30 transition-transform group-hover:rotate-3">
            <Image src="/logo.png" alt="" fill sizes="40px" className="object-contain" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-extrabold tracking-wide text-white">KAWAL QUEST</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Command Center</span>
          </span>
        </Link>

        <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-white/5 xl:hidden" aria-expanded={menuOpen} aria-controls="admin-primary-navigation" onClick={() => setMenuOpen(open => !open)}>
          Menu
        </button>

        <nav id="admin-primary-navigation" className={`${menuOpen ? "absolute right-4 top-full z-50 grid min-w-52 gap-1 rounded-2xl border border-white/10 bg-[#07110d] p-2 shadow-2xl sm:right-6 lg:right-8" : "hidden"} xl:static xl:flex xl:flex-1 xl:items-center xl:justify-center xl:gap-1`} aria-label="Primary navigation">
          {visibleLinks.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors sm:px-4 ${
                  active
                    ? "bg-emerald-400/12 text-emerald-300 ring-1 ring-inset ring-emerald-300/15"
                    : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
                }`}
              >
                <span aria-hidden="true" className="text-base">{link.glyph}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <div className="max-w-36 text-right"><p className="truncate text-xs font-bold text-stone-300">{email ?? "Admin"}</p><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">{role}</p></div>
          <LogoutButton className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-stone-500 hover:bg-white/5 hover:text-white" />
        </div>
      </div>
    </header>
  );
}
