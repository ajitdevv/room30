'use client';

export default function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
  if (totalPages <= 1) return null;

  const pages = [];
  pages.push(1);
  if (page > 3) pages.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2) pages.push('…');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <span className="text-xs text-[var(--muted)]">
        Showing page <span className="font-semibold text-[var(--fg)]">{page}</span> of {totalPages} · {total.toLocaleString('en-IN')} total
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Prev
        </button>
        {pages.map((p, i) => p === '…' ? (
          <span key={`e-${i}`} className="px-1 text-xs text-[var(--muted)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-8 min-w-8 rounded-full px-2.5 text-xs font-semibold transition ${
              p === page
                ? 'bg-[var(--fg)] text-[var(--bg)]'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-indigo-400 hover:text-indigo-500'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40"
        >
          Next
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </nav>
  );
}
