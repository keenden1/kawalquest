import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";

export const metadata: Metadata = { title: "Adventure" };
export const dynamic = "force-dynamic";

const chapters = [{ number: "01", title: "The first calling", text: "Meet the people of the realm and take your first oath as a Kawal." }, { number: "02", title: "Ruins in the mist", text: "Follow old trails into places whose guardians have long since vanished." }, { number: "03", title: "A realm united", text: "Build alliances and prepare the islands for the danger gathering beyond the horizon." }];

export default function AdventurePage() {
  return <main className="min-h-screen bg-[#050b08]"><PublicHeader active="/adventure" /><section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28"><p className="eyebrow">Your journey</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">Adventure awaits.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">Each chapter expands the realm with new missions, characters, and choices. More adventures will arrive as development continues.</p><div className="mt-14 space-y-3">{chapters.map((chapter) => <article key={chapter.number} className="game-panel flex gap-5 rounded-2xl p-6 sm:items-center"><span className="font-mono text-sm font-black text-amber-300">{chapter.number}</span><div><h2 className="text-xl font-black text-white">{chapter.title}</h2><p className="mt-2 leading-7 text-stone-500">{chapter.text}</p></div></article>)}</div></section></main>;
}
