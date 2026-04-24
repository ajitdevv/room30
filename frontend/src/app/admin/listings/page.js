'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import Pagination from '../_components/Pagination';
import { Header } from '../users/page';

export default function ListingsAdminPage() {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded bg-[var(--elevated)]" />}>
      <ListingsAdmin />
    </Suspense>
  );
}

function ListingsAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(sp.get('status') || 'all');
  const [q, setQ] = useState('');
  const [debQ, setDebQ] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDel, setConfirmDel] = useState(null);
  const pageSize = 15;

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [debQ, status]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page, pageSize, status });
    if (debQ) params.set('q', debQ);
    apiGet(`/api/admin/properties?${params.toString()}`, { auth: true })
      .then((r) => {
        if (!alive) return;
        setItems(r.properties || []);
        setTotal(r.total || 0);
      })
      .catch((e) => alive && setErr(friendlyError(e, { context: 'listing' })))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, status, debQ]);

  async function togglePause(p) {
    setBusyId(p.id);
    setErr('');
    try {
      const r = await apiPatch(`/api/admin/properties/${p.id}`, { is_active: !p.is_active }, { auth: true });
      setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: r.property.is_active } : x));
    } catch (e) { setErr(friendlyError(e)); }
    finally { setBusyId(null); }
  }

  async function doDelete(p) {
    setBusyId(p.id);
    setErr('');
    try {
      await apiDelete(`/api/admin/properties/${p.id}`, { auth: true });
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmDel(null);
    } catch (e) { setErr(friendlyError(e)); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <Header title="Listings" subtitle="Pause, resume, or permanently delete any listing." count={total} />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, city, locality…"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 sm:flex-1"
        />
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs font-semibold">
            {[
              ['all', 'All'],
              ['live', 'Live'],
              ['paused', 'Paused'],
              ['deleted', 'Deleted'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => {
                  setStatus(v);
                  const params = new URLSearchParams(sp.toString());
                  if (v === 'all') params.delete('status'); else params.set('status', v);
                  router.replace(`/admin/listings?${params.toString()}`);
                }}
                className={`rounded-full px-3 py-1.5 transition ${
                  status === v ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--elevated)]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">No listings match.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((p) => {
              const statusBadge = p.deleted_at
                ? { text: 'Deleted', cls: 'bg-red-500/10 text-red-600 dark:text-red-300' }
                : p.is_active
                  ? { text: 'Live', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' }
                  : { text: 'Paused', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' };
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-5 sm:py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/property/${p.id}`} target="_blank" className="line-clamp-1 font-semibold transition hover:text-indigo-500">
                        {p.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge.cls}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                      #{p.listing_number ?? '—'} · {p.locality}, {p.city} ·{' '}
                      <span className="font-semibold text-indigo-500">₹{p.rent.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      by {p.profiles?.name?.trim() || p.profiles?.email || '—'}
                    </div>
                  </div>

                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      onClick={() => togglePause(p)}
                      disabled={busyId === p.id || !!p.deleted_at}
                      className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-50 sm:flex-none sm:py-1.5"
                    >
                      {p.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => setConfirmDel(p)}
                      disabled={busyId === p.id}
                      className="flex-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:flex-none sm:py-1.5"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {confirmDel && (
        <ConfirmModal
          title="Delete listing permanently?"
          desc={`"${confirmDel.title}" (#${confirmDel.listing_number ?? '—'}) will be hard-deleted. This cannot be undone.`}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => doDelete(confirmDel)}
          busy={busyId === confirmDel.id}
        />
      )}
    </div>
  );
}

export function ConfirmModal({ title, desc, onCancel, onConfirm, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
        </div>
        <div className="mt-4 text-lg font-semibold tracking-tight">{title}</div>
        <p className="mt-2 text-sm text-[var(--muted)]">{desc}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
