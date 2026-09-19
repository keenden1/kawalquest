"use client";

import { useState } from "react";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";

const PAGE_SIZE = 15;

export type AdminPaymentRow = {
  id: string;
  uid: string;
  playerName: string;
  playerEmail: string;
  packageName: string;
  gold: number | null;
  paidAmount: string | null;
  currency: string | null;
  status: string;
  createdAt: number | null;
};

type StatusFilter = "all" | "paid" | "refunded" | "review";

function statusDetails(status: string): { label: string; className: string; filter: Exclude<StatusFilter, "all"> } {
  if (status === "refunded") return { label: "Refunded", className: "bg-stone-400/10 text-stone-300", filter: "refunded" };
  if (status === "refund_pending_reconciliation") return { label: "Needs review", className: "bg-red-400/10 text-red-300", filter: "review" };
  return { label: status === "credited_pending_sync" ? "Paid" : "Recorded", className: "bg-emerald-400/10 text-emerald-300", filter: "paid" };
}

function formatAmount(payment: AdminPaymentRow): string {
  if (!payment.paidAmount || !payment.currency) return "Amount unavailable";
  const amount = Number(payment.paidAmount);
  if (!Number.isFinite(amount)) return `${payment.currency} ${payment.paidAmount}`;
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: payment.currency }).format(amount);
  } catch {
    return `${payment.currency} ${payment.paidAmount}`;
  }
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "Date unavailable";
  return new Date(timestamp).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminPaymentHistory({ payments }: { payments: AdminPaymentRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeStatus(value: StatusFilter) {
    setStatus(value);
    setPage(1);
  }

  const query = search.trim().toLowerCase();
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = !query || [payment.playerName, payment.playerEmail, payment.uid, payment.packageName, payment.id]
      .some((value) => value.toLowerCase().includes(query));
    const matchesStatus = status === "all" || statusDetails(payment.status).filter === status;
    return matchesSearch && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="game-panel overflow-hidden rounded-2xl" aria-labelledby="payment-history-heading">
      <div className="flex flex-col gap-3 border-b border-white/7 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="payment-history-heading" className="font-bold text-white">Payment receipts</h2>
          <p className="mt-1 text-xs text-stone-500">Newest first · Philippine time · Up to 50 recent receipts per player</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={changeSearch} placeholder="Search player or receipt..." />
          <select value={status} onChange={(event) => changeStatus(event.target.value as StatusFilter)} className="rounded-xl border border-white/10 bg-[#0a1711] px-4 py-2 text-sm text-stone-300" aria-label="Filter payment status">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="review">Needs review</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-black/15"><tr>{["Date", "Player", "Purchase", "Amount", "Gold", "Status", "Receipt"].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/6">
            {visiblePayments.map((payment) => {
              const paymentStatus = statusDetails(payment.status);
              return (
                <tr key={`${payment.uid}-${payment.id}`} className="hover:bg-white/3">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-400">{formatDate(payment.createdAt)}</td>
                  <td className="px-5 py-4"><p className="font-bold text-stone-200">{payment.playerName}</p><p className="mt-1 max-w-48 truncate text-xs text-stone-600" title={payment.playerEmail || payment.uid}>{payment.playerEmail || payment.uid}</p></td>
                  <td className="px-5 py-4 font-semibold text-stone-300">{payment.packageName}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-amber-200">{formatAmount(payment)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-stone-300">{payment.gold?.toLocaleString() ?? "—"}</td>
                  <td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${paymentStatus.className}`}>{paymentStatus.label}</span></td>
                  <td className="max-w-52 px-5 py-4"><span className="block truncate font-mono text-xs text-stone-500" title={payment.id}>{payment.id}</span></td>
                </tr>
              );
            })}
            {visiblePayments.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-stone-500">{payments.length === 0 ? "No confirmed Xsolla payments have been recorded yet." : "No payments match this search or status."}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filteredPayments.length} onChange={setPage} />
    </section>
  );
}
