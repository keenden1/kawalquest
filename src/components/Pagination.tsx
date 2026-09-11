"use client";

// Client-side pagination over an already-fetched array -- none of the admin lists this is
// used on (shop items, players, users) are large enough yet to need a paginated Firestore
// query; this just slices what's already in memory. Renders nothing when everything fits
// on one page.
export default function Pagination({
  page,
  pageSize,
  totalItems,
  onChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  if (pageCount <= 1) return null;

  const start = (clampedPage - 1) * pageSize + 1;
  const end = Math.min(clampedPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-white/7 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-stone-500">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-stone-300 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-xs font-bold text-stone-400">
          Page {clampedPage} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(clampedPage + 1)}
          disabled={clampedPage >= pageCount}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-stone-300 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
