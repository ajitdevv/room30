'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useSaved } from '@/lib/useSaved';
import { formatListingNumber } from '@/lib/format';
import SaveButton from '@/app/_components/SaveButton';
import LazyImg from '@/app/_components/LazyImg';
import Pagination from '@/app/_components/Pagination';

const PAGE_SIZE = 15;

export default function SavedPage() {
  const { ids, mounted, clear, count } = useSaved();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!mounted) return;
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    // Fetch each id in parallel. Missing/deleted listings silently drop.
    Promise.allSettled(
      ids.map((id) => apiGet(`/api/properties/${id}`).then((r) => r.property))
    )
      .then((results) => {
        const good = results
          .filter((r) => r.status === 'fulfilled' && r.value && !r.value.deleted_at)
          .map((r) => r.value);
        // Preserve saved-order (most recent first = same as ids order)
        const byId = new Map(good.map((p) => [p.id, p]));
        setItems(ids.map((id) => byId.get(id)).filter(Boolean));
      })
      .finally(() => setLoading(false));
  }, [ids, mounted]);

  const paged = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Wishlist</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Saved rooms</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{count} saved · stored on this device</p>
        </div>
        {count > 0 && (
          <button
            onClick={() => { if (confirm('Remove all saved rooms?')) clear(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:border-red-400 hover:text-red-500"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
            Clear all
          </button>
        )}
      </header>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="aspect-[4/3] animate-pulse bg-[var(--elevated)]" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--elevated)]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--elevated)]" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((p, i) => <SavedCard key={p.id} p={p} index={i} />)}
          </div>
          <Pagination page={page} total={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function SavedCard({ p, index }) {
  const img = p.property_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  return (
    <Link
      href={`/property/${p.id}`}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/5"
      style={{ animation: `fade-up .4s ease-out ${index * 40}ms both` }}
    >
      <div className="relative aspect-[4/3]">
        <LazyImg src={img} alt={p.title} className="h-full w-full" />
        <SaveButton propertyId={p.id} variant="overlay" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 font-mono text-[10px] font-medium text-white backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          {formatListingNumber(p.listing_number)}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0 font-semibold tracking-tight line-clamp-1">{p.title}</div>
          <div className="flex items-baseline gap-0.5 whitespace-nowrap text-indigo-500">
            <span className="text-base font-bold">₹{p.rent.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-[var(--muted)]">/mo</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {p.locality}, {p.city}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/10 text-red-500">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </div>
      <div className="mt-4 text-lg font-semibold">No saved rooms yet</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">Tap the heart on any listing to save it for later. Your wishlist lives on this device.</p>
      <Link href="/listings" className="mt-5 inline-flex rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-xl">
        Browse listings
      </Link>
    </div>
  );
}
