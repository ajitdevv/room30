'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useAuthUser } from '@/lib/useAuthUser';

const DISMISS_PREFIX = 'r30-offer-banner-dismissed:';

function variantClass(v) {
  switch (v) {
    case 'emerald': return 'from-emerald-600 to-teal-700';
    case 'amber':   return 'from-amber-500 to-orange-600';
    case 'indigo':  return 'from-indigo-600 to-blue-700';
    case 'rose':    return 'from-rose-500 to-pink-600';
    case 'dark':    return 'from-slate-800 to-slate-950';
    case 'gradient':
    default:        return 'from-indigo-600 via-violet-600 to-fuchsia-600';
  }
}

export default function OfferBanner() {
  const { role, loading: authLoading } = useAuthUser();
  const pathname = usePathname();
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  // Fetch active banner for current audience.
  useEffect(() => {
    if (authLoading) return;
    const audience = !role ? 'guest' : role === 'owner' ? 'owner' : 'renter';
    let alive = true;
    apiGet(`/api/offers/active?audience=${audience}`)
      .then((r) => { if (alive) setBanner(r?.banner || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [authLoading, role]);

  // Resolve dismissed-for-this-banner from localStorage.
  useEffect(() => {
    if (!banner) { setDismissed(true); return; }
    try {
      const k = DISMISS_PREFIX + banner.id;
      setDismissed(!!localStorage.getItem(k));
    } catch { setDismissed(false); }
  }, [banner]);

  // Never show on admin pages or checkout-like flows.
  if (!banner || dismissed) return null;
  if (pathname?.startsWith('/admin')) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_PREFIX + banner.id, '1'); } catch {}
    setDismissed(true);
  }

  const grad = variantClass(banner.variant);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${grad} text-white`}>
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        {banner.discount_label && (
          <span className="hidden shrink-0 items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/30 backdrop-blur sm:inline-flex">
            {banner.discount_label}
          </span>
        )}
        <div className="min-w-0 flex-1 text-[12px] leading-tight sm:text-sm">
          <span className="font-semibold">{banner.title}</span>
          {banner.subtitle && (
            <span className="ml-2 hidden opacity-90 sm:inline">— {banner.subtitle}</span>
          )}
        </div>
        {banner.cta_label && banner.cta_href && (
          <Link
            href={banner.cta_href}
            className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm transition hover:bg-white sm:px-3.5 sm:py-1.5 sm:text-xs"
          >
            {banner.cta_label}
          </Link>
        )}
        {banner.dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
