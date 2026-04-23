'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatListingNumber } from '@/lib/format';
import LazyImg from './LazyImg';

/**
 * Related listings, shown below a property detail.
 * Fetches pre-bucketed data from /api/properties/:id/related and renders
 * each non-empty bucket as its own horizontal strip.
 *
 * Optimised: single network call, three parallel DB queries on the backend,
 * de-duplicated across buckets server-side.
 */
export default function RelatedListings({ propertyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    apiGet(`/api/properties/${propertyId}/related?limit=8`)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setErr(e.message || ''); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  if (loading) return <RelatedSkeleton />;
  if (err || !data) {
    return <BrowseAllCta />;
  }

  const src = data.source || {};
  const roomTypeLabel = src.room_type
    ? src.room_type.toUpperCase().replace('RK', ' RK').replace('BHK', ' BHK')
    : null;

  const buckets = [
    {
      key: 'loc',
      eyebrow: 'Same location',
      title: src.locality ? `More rooms in ${src.locality}` : 'Nearby rooms',
      hint: src.city ? `Listings in your chosen neighbourhood.` : null,
      items: data.same_locality || [],
      tone: 'violet',
    },
    {
      key: 'type',
      eyebrow: 'Same type',
      title: roomTypeLabel
        ? `Similar ${roomTypeLabel.trim()} homes in ${src.city || 'your city'}`
        : 'Similar homes',
      hint: 'Same configuration — just different addresses.',
      items: data.same_type || [],
      tone: 'emerald',
    },
    {
      key: 'price',
      eyebrow: 'Similar budget',
      title: src.min_rent && src.max_rent
        ? `Between ₹${src.min_rent.toLocaleString('en-IN')} and ₹${src.max_rent.toLocaleString('en-IN')}`
        : 'Similar budget',
      hint: 'Within ±25% of this listing.',
      items: data.similar_price || [],
      tone: 'amber',
    },
  ].filter((b) => b.items.length > 0);

  const others = data.others || [];
  const totalActive = data.total_active || 0;
  const othersRemaining = Math.max(0, totalActive - (others.length + (data.same_locality?.length || 0) + (data.same_type?.length || 0) + (data.similar_price?.length || 0) + 1));

  // Nothing anywhere — minimal fallback.
  if (buckets.length === 0 && others.length === 0) return <BrowseAllCta />;

  return (
    <section className="mt-12 border-t border-[var(--border)] pt-10 sm:mt-16 sm:pt-14">
      {buckets.length > 0 && (
        <div className="space-y-10 sm:space-y-14">
          {buckets.map((b) => (
            <Strip key={b.key} {...b} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <AllListings
          items={others}
          totalActive={totalActive}
          othersRemaining={othersRemaining}
          withTopBorder={buckets.length > 0}
        />
      )}
    </section>
  );
}

function Strip({ eyebrow, title, hint, items, tone }) {
  const toneClass = {
    violet:  'from-violet-500/15 to-fuchsia-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
    emerald: 'from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    amber:   'from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  }[tone] || '';

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${toneClass}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {eyebrow}
          </span>
          <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
          {hint && (
            <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">{hint}</p>
          )}
        </div>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
        <ul className="flex gap-3 pr-4 sm:gap-4">
          {items.map((p) => <Card key={p.id} p={p} />)}
          <li aria-hidden className="w-2 flex-shrink-0" />
        </ul>
      </div>
    </div>
  );
}

function Card({ p }) {
  const img = p.property_images
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

  return (
    <li className="w-[240px] flex-shrink-0 sm:w-[280px]">
      <Link
        href={`/property/${p.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--accent)_55%,var(--border))] hover:shadow-[var(--shadow-accent)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyImg src={img} alt={p.title} className="h-full w-full transition duration-500 group-hover:scale-[1.04]" />
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
            {formatListingNumber(p.listing_number)}
          </span>
          {p.room_type && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-800 backdrop-blur">
              {p.room_type}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 text-sm font-semibold tracking-tight line-clamp-1">{p.title}</div>
            <div className="whitespace-nowrap text-[color:var(--accent)]">
              <span className="text-sm font-bold">₹{Number(p.rent).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-[var(--muted)]">/mo</span>
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)] line-clamp-1">
            <span>{p.locality}</span>
            <span className="text-[var(--subtle)]">·</span>
            <span>{p.city}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function AllListings({ items, totalActive, othersRemaining, withTopBorder }) {
  return (
    <div className={`${withTopBorder ? 'mt-14 border-t border-[var(--border)] pt-10 sm:mt-16 sm:pt-14' : ''}`}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--elevated)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] ring-1 ring-[var(--border)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] opacity-60" />
            Everything else
          </span>
          <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
            All listings
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
            {totalActive > 0
              ? `${totalActive} verified ${totalActive === 1 ? 'listing' : 'listings'} across Jaipur.`
              : 'Fresh listings, freshly verified.'}
          </p>
        </div>
        <Link
          href="/listings"
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--fg)] transition hover:border-[color-mix(in_oklab,var(--accent)_50%,var(--border))] hover:text-[color:var(--accent)] sm:inline-flex"
        >
          Open full browse
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </Link>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((p) => <GridCard key={p.id} p={p} />)}
      </ul>

      {othersRemaining > 0 && (
        <Link
          href="/listings"
          className="group mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_oklab,var(--accent)_12%,var(--surface))] via-[var(--surface)] to-[color-mix(in_oklab,#f472b6_8%,var(--surface))] p-5 transition hover:border-[color-mix(in_oklab,var(--accent)_55%,var(--border))] hover:shadow-[var(--shadow-accent)] sm:mt-10 sm:p-6"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
              Keep exploring
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
              See {othersRemaining}+ more verified listings
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
              Open the browse page to filter by rent, locality, furnishing and more.
            </p>
          </div>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md transition group-hover:translate-x-0.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      )}
    </div>
  );
}

function GridCard({ p }) {
  const img = p.property_images
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

  return (
    <li>
      <Link
        href={`/property/${p.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--accent)_50%,var(--border))] hover:shadow-[var(--shadow-accent)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyImg src={img} alt={p.title} className="h-full w-full transition duration-500 group-hover:scale-[1.04]" />
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
            {formatListingNumber(p.listing_number)}
          </span>
          {p.room_type && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-800 backdrop-blur">
              {p.room_type}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 text-sm font-semibold tracking-tight line-clamp-1 sm:text-[15px]">{p.title}</div>
            <div className="whitespace-nowrap text-[color:var(--accent)]">
              <span className="text-sm font-bold sm:text-[15px]">₹{Number(p.rent).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-[var(--muted)]">/mo</span>
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)] line-clamp-1 sm:mt-1 sm:text-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3 flex-shrink-0"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{p.locality}</span>
            <span className="text-[var(--subtle)]">·</span>
            <span>{p.city}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function BrowseAllCta() {
  return (
    <Link
      href="/listings"
      className="group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] to-[var(--surface)] p-5 transition hover:border-[color-mix(in_oklab,var(--accent)_50%,var(--border))] hover:shadow-[var(--shadow-accent)] sm:mt-14 sm:p-6"
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
          Explore more
        </div>
        <div className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
          Browse every verified listing
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
          Open filters, compare price, and shortlist rooms on the full browse page.
        </p>
      </div>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md transition group-hover:translate-x-0.5">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

function RelatedSkeleton() {
  return (
    <section className="mt-12 border-t border-[var(--border)] pt-10 sm:mt-16 sm:pt-14">
      <div className="space-y-10">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="skeleton h-5 w-44" />
            <div className="mt-5 flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="w-[240px] flex-shrink-0 sm:w-[280px]">
                  <div className="skeleton aspect-[4/3] w-full" />
                  <div className="mt-3 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
