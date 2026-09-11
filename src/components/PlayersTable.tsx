"use client";

import { useState } from "react";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";

const PAGE_SIZE = 10;

export type PlayerRow = { uid: string; username: string; points: number; createdAt: string | null };

export default function PlayersTable({ players }: { players: PlayerRow[] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const filteredPlayers = search.trim()
    ? players.filter((player) => player.username.toLowerCase().includes(search.trim().toLowerCase()))
    : players;
  const pageCount = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const pagedPlayers = filteredPlayers.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // Rank reflects true position in the full (unfiltered) sorted roster, not the filtered
  // list's index -- searching for one player should still show their real rank.
  const rankByUid = new Map(players.map((player, index) => [player.uid, index]));

  return (
    <section className="game-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/7 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-white">Adventurer rankings</h2><p className="mt-0.5 text-xs text-stone-500">Sorted by highest quest points</p></div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={changeSearch} placeholder="Search players..." />
          <span className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live data</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/15 text-stone-500"><tr>{["Rank", "Adventurer", "Quest points", "Player ID", "Joined"].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/6">
            {pagedPlayers.map((player) => {
              const rank = rankByUid.get(player.uid) ?? 0;
              return (
                <tr key={player.uid} className="transition-colors hover:bg-white/3">
                  <td className="px-5 py-4"><span className={`grid size-8 place-items-center rounded-lg text-xs font-extrabold ${rank < 3 ? "bg-amber-300/12 text-amber-300" : "bg-white/4 text-stone-500"}`}>{rank + 1}</span></td>
                  <td className="px-5 py-4 font-bold text-stone-100">{player.username}</td>
                  <td className="px-5 py-4 font-mono font-bold text-emerald-300">{player.points.toLocaleString()}</td>
                  <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-stone-600" title={player.uid}>{player.uid}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-500">{player.createdAt ? new Date(player.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}</td>
                </tr>
              );
            })}
            {filteredPlayers.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-500">No players match &quot;{search}&quot;.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={clampedPage} pageSize={PAGE_SIZE} totalItems={filteredPlayers.length} onChange={setPage} />
    </section>
  );
}
