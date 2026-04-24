'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { formatListingNumber } from '@/lib/format';
import SearchBox from '../_components/SearchBox';
import SaveButton from '../_components/SaveButton';
import LazyImg from '../_components/LazyImg';

const PAGE_SIZE = 12;

export default function ListingsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Listings />
    </Suspense>
  );
}

function Listings() {
  const sp = useSearchParams();
  const q = sp.get('q') || '';

  const [filters, setFilters] = useState({
    minRent: '', maxRent: '', tenantType: '', furnishing: '', roomType: '',
  });
  const [sort, setSort] = useState('new');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Debounce filters to prevent spam fetches while user types numeric ranges.
  const [debounced, setDebounced] = useState(filters);
  const debounceTimer = useRef(null);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [filters]);

  // Reset to page 1 when filters or query change.
  useEffect(() => { setPage(1); }, [q, debounced]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (debounced.minRent) params.set('minRent', debounced.minRent);
    if (debounced.maxRent) params.set('maxRent', debounced.maxRent);
    if (debounced.tenantType) params.set('tenant_type', debounced.tenantType);
    if (debounced.furnishing)  params.set('furnishing', debounced.furnishing);
    if (debounced.roomType)    params.set('room_type', debounced.roomType);
    // Fetch a large page once and paginate client-side for simplicity.
    params.set('limit', '200');
    let cancelled = false;
    setLoading(true);
    setErr('');
    apiGet(`/api/properties?${params.toString()}`)
      .then((r) => { if (!cancelled) setItems(r.properties || []); })
      .catch((e) => { if (!cancelled) setErr(friendlyError(e, { context: 'listing' })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, debounced]);

  // Fetch top-viewed listings once — rendered as a "Trending" strip above
  // the grid when the user hasn't typed a search or applied filters.
  useEffect(() => {
    let cancelled = false;
    apiGet('/api/properties/trending?limit=6')
      .then((r) => { if (!cancelled) setTrending(r.properties || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    const a = [...items];
    if (sort === 'price-asc') a.sort((x, y) => x.rent - y.rent);
    else if (sort === 'price-desc') a.sort((x, y) => y.rent - x.rent);
    return a;
  }, [items, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = useMemo(() =>
    sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  , [sorted, page]);

  const activeCount = Object.values(filters).filter(Boolean).length;
  function reset() {
    setFilters({ minRent: '', maxRent: '', tenantType: '', furnishing: '', roomType: '' });
  }

  return (
    <div>
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--hero-from)] to-[var(--bg)]">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-10">
          <div className="flex flex-col items-center text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500 sm:text-xs">Discover</div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-4xl">
              {q ? <>Rooms in <span className="text-indigo-500">{q}</span></> : 'Browse monthly rentals'}
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] sm:mt-2 sm:text-sm">
              {loading ? 'Loading…' : `${items.length} listing${items.length === 1 ? '' : 's'} found`}
            </p>
            <div className="mt-4 w-full sm:mt-6"><SearchBox initial={q} /></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="sticky top-[60px] z-10 -mx-4 mb-4 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] px-4 py-2.5 backdrop-blur sm:top-[68px] sm:-mx-6 sm:mb-6 sm:px-6 sm:py-3">
          {/* Mobile: Filter / Sort triggers + view toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              Filters
              {activeCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSortOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7h13M3 12h9M3 17h5M17 4v16m0 0l4-4m-4 4l-4-4"/></svg>
              Sort
            </button>
            <div className="flex overflow-hidden rounded-xl border border-[var(--border)]">
              <ViewBtn active={view === 'grid'} onClick={() => setView('grid')} label="Grid">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </ViewBtn>
              <ViewBtn active={view === 'list'} onClick={() => setView('list')} label="List">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              </ViewBtn>
            </div>
          </div>

          {/* Desktop: inline filter bar */}
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <RangeInput label="Min" value={filters.minRent} onChange={(v) => setFilters({ ...filters, minRent: v })} />
            <RangeInput label="Max" value={filters.maxRent} onChange={(v) => setFilters({ ...filters, maxRent: v })} />
            <Select value={filters.tenantType} onChange={(v) => setFilters({ ...filters, tenantType: v })}
              options={[['', 'Any tenant'], ['student', 'Student'], ['family', 'Family'], ['professional', 'Professional']]} />
            <Select value={filters.furnishing} onChange={(v) => setFilters({ ...filters, furnishing: v })}
              options={[['', 'Any furnishing'], ['unfurnished', 'Unfurnished'], ['semi', 'Semi-furnished'], ['full', 'Fully furnished']]} />
            <Select value={filters.roomType} onChange={(v) => setFilters({ ...filters, roomType: v })}
              options={[['', 'Any room'], ['1rk', '1 RK'], ['1bhk', '1 BHK'], ['2bhk', '2 BHK'], ['3bhk', '3 BHK'], ['pg', 'PG'], ['shared', 'Shared']]} />
            {activeCount > 0 && (
              <button onClick={reset} className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
                Reset · {activeCount}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Select value={sort} onChange={setSort} compact
                options={[['new', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']]} />
              <div className="flex overflow-hidden rounded-full border border-[var(--border)]">
                <ViewBtn active={view === 'grid'} onClick={() => setView('grid')} label="Grid">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </ViewBtn>
                <ViewBtn active={view === 'list'} onClick={() => setView('list')} label="List">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                </ViewBtn>
              </div>
            </div>
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

        {!q && activeCount === 0 && !loading && trending.length > 0 && (
          <TrendingStrip items={trending} />
        )}

        {loading ? (
          <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3' : 'space-y-2 sm:space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} view={view} />)}
          </div>
        ) : sorted.length === 0 ? (
          <Empty onReset={reset} hasFilters={activeCount > 0} />
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {pageItems.map((p, i) => <PropertyCard key={p.id} p={p} index={i} />)}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {pageItems.map((p, i) => <PropertyRow key={p.id} p={p} index={i} />)}
              </div>
            )}

            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
          </>
        )}
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        activeCount={activeCount}
        reset={reset}
        resultCount={sorted.length}
        loading={loading}
      />
      <SortSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        value={sort}
        onChange={setSort}
      />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  const push = (n) => pages.push(n);
  push(1);
  if (page > 3) push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i);
  if (page < totalPages - 2) push('…');
  if (totalPages > 1) push(totalPages);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40"
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
          className={`h-9 min-w-9 rounded-full px-3 text-xs font-semibold transition ${
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
        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40"
      >
        Next
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </nav>
  );
}

function RangeInput({ label, value, onChange }) {
  return (
    <div className="flex items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs">
      <span className="pl-3 text-[var(--muted)]">{label}</span>
      <span className="pl-1 text-[var(--subtle)]">₹</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric"
        placeholder="—"
        className="w-16 bg-transparent py-2 pr-3 pl-1 outline-none placeholder:text-[var(--subtle)]"
      />
    </div>
  );
}

function Select({ value, onChange, options, compact }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] pr-8 text-xs font-medium text-[var(--fg)] outline-none transition focus:border-indigo-400 ${compact ? 'py-2 pl-3' : 'py-2 pl-3.5'}`}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}

function ViewBtn({ active, onClick, children, label }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={`flex h-9 w-9 items-center justify-center text-xs transition ${active ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>
      {children}
    </button>
  );
}

function TrendingStrip({ items }) {
  // Skip rendering if nothing has real traction yet — a listing needs at
  // least one recorded view to earn a spot.
  const real = items.filter((p) => (p.view_count ?? 0) > 0).slice(0, 6);
  if (real.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:border-orange-500/30 dark:from-orange-500/10 dark:to-amber-500/10 dark:text-orange-300">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M13.5 0c0 4.5-3.5 5.5-3.5 10 0 2.5 2 4.5 4.5 4.5S19 12.5 19 10c0-2-1-4-2.5-5 1 3-1 4-3 5zM5 14c0 5 3.5 10 8 10s8-4 8-9c-2 2-5 3-7 1-2 3-9 3-9-2z"/></svg>
            Trending in Jaipur
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
            Most-viewed this week
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Clicked by the most renters in the last few days — they get snapped up fast.
          </p>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
        <ul className="flex gap-4 pr-4">
          {real.map((p, i) => {
            const img = p.property_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
            return (
              <li key={p.id} className="w-[260px] flex-shrink-0 sm:w-[300px]">
                <Link
                  href={`/property/${p.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <div className="relative aspect-[4/3]">
                    <LazyImg src={img} alt={p.title} className="h-full w-full" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                      #{i + 1} Hot
                    </span>
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                      {compactNumber(p.view_count)}
                    </span>
                    <span className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white">
                      {formatListingNumber(p.listing_number)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0 text-sm font-semibold tracking-tight line-clamp-1">{p.title}</div>
                      <div className="whitespace-nowrap text-indigo-500">
                        <span className="text-sm font-bold">₹{p.rent.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-[var(--muted)]">/mo</span>
                      </div>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">{p.locality}, {p.city}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function compactNumber(n) {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

function PropertyCard({ p, index }) {
  const img = p.property_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  return (
    <Link
      href={`/property/${p.id}`}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/5"
      style={{ animation: `fade-up .45s ease-out ${Math.min(index, 8) * 50}ms both` }}
    >
      <div className="relative aspect-[4/3]">
        <LazyImg src={img} alt={p.title} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 font-mono text-[10px] font-medium text-white backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-emerald-400"/>{formatListingNumber(p.listing_number)}
        </span>
        <SaveButton propertyId={p.id} variant="overlay" />
        {p.room_type && (
          <span className="absolute left-3 bottom-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-800 backdrop-blur">
            {p.room_type}
          </span>
        )}
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
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
          {p.furnishing && <Tag>{cap(p.furnishing)}</Tag>}
          {p.tenant_type && <Tag>{cap(p.tenant_type)}</Tag>}
          <Tag>₹{p.deposit.toLocaleString('en-IN')} deposit</Tag>
        </div>
      </div>
    </Link>
  );
}

function PropertyRow({ p, index }) {
  const img = p.property_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  return (
    <Link
      href={`/property/${p.id}`}
      className="group flex overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/5"
      style={{ animation: `fade-up .4s ease-out ${Math.min(index, 8) * 40}ms both` }}
    >
      <div className="relative h-28 w-32 flex-shrink-0 sm:h-40 sm:w-56">
        <LazyImg src={img} alt={p.title} className="h-full w-full" />
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white">{formatListingNumber(p.listing_number)}</span>
        <SaveButton propertyId={p.id} variant="overlay" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div>
          <div className="flex items-baseline justify-between gap-2 sm:gap-3">
            <div className="line-clamp-1 text-sm font-semibold tracking-tight sm:text-base">{p.title}</div>
            <div className="whitespace-nowrap text-indigo-500"><span className="text-sm font-bold sm:text-base">₹{p.rent.toLocaleString('en-IN')}</span><span className="text-[10px] text-[var(--muted)] sm:text-xs">/mo</span></div>
          </div>
          <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)] sm:mt-1 sm:text-xs">{p.locality}, {p.city}</div>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] text-[var(--muted)] sm:gap-1.5 sm:text-[11px]">
          {p.room_type && <Tag>{p.room_type.toUpperCase()}</Tag>}
          {p.furnishing && <Tag>{cap(p.furnishing)}</Tag>}
          {p.tenant_type && <Tag>{cap(p.tenant_type)}</Tag>}
        </div>
      </div>
    </Link>
  );
}

function Tag({ children }) {
  return <span className="rounded-full border border-[var(--border)] bg-[var(--elevated)] px-2 py-0.5">{children}</span>;
}

function CardSkeleton({ view }) {
  if (view === 'list') {
    return <div className="flex h-40 animate-pulse overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="h-full w-56 bg-[var(--elevated)]"/><div className="flex-1 p-4 space-y-3"><div className="h-4 w-2/3 rounded bg-[var(--elevated)]"/><div className="h-3 w-1/2 rounded bg-[var(--elevated)]"/><div className="h-3 w-1/3 rounded bg-[var(--elevated)]"/></div></div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-[4/3] animate-pulse bg-[var(--elevated)]"/>
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--elevated)]"/>
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--elevated)]"/>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="mx-auto max-w-6xl px-4 py-10"><div className="h-10 animate-pulse rounded-xl bg-[var(--elevated)]"/></div>;
}

function Empty({ onReset, hasFilters }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
      </div>
      <div className="mt-4 text-lg font-semibold">No listings match</div>
      <p className="mt-1 text-sm text-[var(--muted)]">Try loosening your filters or broadening your search.</p>
      {hasFilters && (
        <button onClick={onReset} className="mt-4 rounded-full bg-[var(--fg)] px-5 py-2 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90">
          Reset filters
        </button>
      )}
    </div>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function FilterDrawer({ open, onClose, filters, setFilters, activeCount, reset, resultCount, loading }) {
  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 sm:hidden ${open ? '' : 'pointer-events-none'}`}>
      <button
        aria-label="Close filters"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={`absolute right-0 top-0 flex h-full w-[88%] max-w-[380px] flex-col bg-[var(--bg)] shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <div className="text-base font-semibold">Filters</div>
            <div className="text-[11px] text-[var(--muted)]">
              {activeCount > 0 ? `${activeCount} applied` : 'No filters applied'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--elevated)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <FilterSection title="Price range (₹/month)">
            <div className="flex items-center gap-2">
              <input
                value={filters.minRent}
                onChange={(e) => setFilters({ ...filters, minRent: e.target.value })}
                inputMode="numeric"
                placeholder="Min"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <span className="text-[var(--muted)]">–</span>
              <input
                value={filters.maxRent}
                onChange={(e) => setFilters({ ...filters, maxRent: e.target.value })}
                inputMode="numeric"
                placeholder="Max"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </FilterSection>

          <FilterSection title="Tenant type">
            <ChipGroup
              value={filters.tenantType}
              onChange={(v) => setFilters({ ...filters, tenantType: v })}
              options={[['', 'Any'], ['student', 'Student'], ['family', 'Family'], ['professional', 'Professional']]}
            />
          </FilterSection>

          <FilterSection title="Furnishing">
            <ChipGroup
              value={filters.furnishing}
              onChange={(v) => setFilters({ ...filters, furnishing: v })}
              options={[['', 'Any'], ['unfurnished', 'Unfurnished'], ['semi', 'Semi-furnished'], ['full', 'Fully furnished']]}
            />
          </FilterSection>

          <FilterSection title="Room type">
            <ChipGroup
              value={filters.roomType}
              onChange={(v) => setFilters({ ...filters, roomType: v })}
              options={[['', 'Any'], ['1rk', '1 RK'], ['1bhk', '1 BHK'], ['2bhk', '2 BHK'], ['3bhk', '3 BHK'], ['pg', 'PG'], ['shared', 'Shared']]}
            />
          </FilterSection>
        </div>

        <footer className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <button
            onClick={reset}
            disabled={activeCount === 0}
            className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--fg)] disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:brightness-110"
          >
            {loading ? 'Loading…' : `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active
                ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-sm shadow-indigo-600/20'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-indigo-300'
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function SortSheet({ open, onClose, value, onChange }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const options = [
    ['new', 'Newest first'],
    ['price-asc', 'Price: low to high'],
    ['price-desc', 'Price: high to low'],
  ];

  function pick(v) {
    onChange(v);
    onClose();
  }

  return (
    <div className={`fixed inset-0 z-50 sm:hidden ${open ? '' : 'pointer-events-none'}`}>
      <button
        aria-label="Close sort"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sort"
        className={`absolute inset-x-0 bottom-0 rounded-t-2xl bg-[var(--bg)] shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>
        <header className="flex items-center justify-between px-4 pb-1 pt-2">
          <div className="text-base font-semibold">Sort by</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--elevated)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </header>
        <ul className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {options.map(([v, l]) => {
            const active = value === v;
            return (
              <li key={v}>
                <button
                  onClick={() => pick(v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--elevated)]"
                >
                  <span className={active ? 'font-semibold text-indigo-500' : ''}>{l}</span>
                  {active && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
