"use client";

import { useState } from "react";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";
import { ROLES, type Role } from "@/lib/roles";

const PAGE_SIZE = 10;

export type ManagedUser = { uid: string; email: string; name: string; role: Role; disabled: boolean };

export default function RoleManager({ initialUsers, currentUid }: { initialUsers: ManagedUser[]; currentUid: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const filteredUsers = search.trim()
    ? users.filter((user) => {
        const query = search.trim().toLowerCase();
        return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      })
    : users;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const pagedUsers = filteredUsers.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  async function changeRole(uid: string, role: Role) {
    setSavingUid(uid);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users/role", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Role update failed.");
      setUsers((current) => current.map((user) => user.uid === uid ? { ...user, role } : user));
      setMessage("Role updated. The user must sign in again for the new access to take effect.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Role update failed.");
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <div className="game-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/7 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-white">Firebase users</h2><p className="mt-0.5 text-xs text-stone-500">Only superadmins can change access roles</p></div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={changeSearch} placeholder="Search users..." />
          <span className="shrink-0 rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">{users.length} accounts</span>
        </div>
      </div>
      {message && <div className="border-b border-white/7 bg-emerald-400/7 px-5 py-3 text-xs text-emerald-200" role="status">{message}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm"><thead className="bg-black/15"><tr>{["Player", "Status", "Access role"].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/6">
            {pagedUsers.map((user) => <tr key={user.uid} className="hover:bg-white/3"><td className="px-5 py-4"><p className="font-bold text-stone-200">{user.name}</p><p className="mt-1 text-xs text-stone-600">{user.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${user.disabled ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>{user.disabled ? "Disabled" : "Active"}</span></td><td className="px-5 py-4"><select value={user.role} disabled={user.uid === currentUid || savingUid === user.uid} onChange={(event) => changeRole(user.uid, event.target.value as Role)} className="rounded-xl border border-white/10 bg-[#0a1711] px-3 py-2 text-xs font-bold capitalize text-stone-200 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Role for ${user.email}`}>{ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>{user.uid === currentUid && <span className="ml-2 text-[10px] text-stone-600">You</span>}</td></tr>)}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-stone-500">No users match &quot;{search}&quot;.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={clampedPage} pageSize={PAGE_SIZE} totalItems={filteredUsers.length} onChange={setPage} />
    </div>
  );
}
