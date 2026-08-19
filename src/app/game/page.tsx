import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";

export const metadata: Metadata = { title: "The Game" };
export const dynamic = "force-dynamic";

export default function GamePage() {
  return <main className="min-h-screen bg-[#050b08]"><PublicHeader active="/game" /><section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28"><p className="eyebrow">Guard the realm</p><h1 className="mt-4 max-w-3xl text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">Become the guardian your realm remembers.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-stone-400">Kawal Quest is an adventure RPG about answering the call, protecting island communities, and building a legend through the choices you make.</p><div className="mt-14 grid gap-4 sm:grid-cols-3">{[["Explore","Journey through tropical wilds, forgotten ruins, and settlements worth defending."],["Protect","Face threats through quests that test courage, judgment, and skill."],["Rise","Earn experience, grow your standing, and claim a place among the greatest Kawal."]].map(([title, text]) => <article key={title} className="game-panel rounded-2xl p-6"><h2 className="text-xl font-black text-amber-300">{title}</h2><p className="mt-3 text-sm leading-7 text-stone-500">{text}</p></article>)}</div></section></main>;
}
