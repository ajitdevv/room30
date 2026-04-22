'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useAuthUser } from '@/lib/useAuthUser';

const DISMISS_PREFIX = 'r30-offer-popup-dismissed:';
const SHOW_DELAY_MS = 2500;       // wait a bit so it doesn't feel jarring
const REMIND_AFTER_DAYS = 3;      // how long a dismissal sticks

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

export default function OfferPopup() {
  const { role, loading: authLoading } = useAuthUser();
  const pathname = usePathname();
  const [popup, setPopup] = useState(null);
  const [open, setOpen] = useState(false);
  const [mountId, setMountId] = useState(null);

  // Fetch active popup for current audience.
  useEffect(() => {
    if (authLoading) return;
    const audience = !role ? 'guest' : role === 'owner' ? 'owner' : 'renter';
    let alive = true;
    apiGet(`/api/offers/active?audience=${audience}`)
      .then((r) => { if (alive) setPopup(r?.popup || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [authLoading, role]);

  // Decide whether to open (with delay + dismissal memory).
  useEffect(() => {
    if (!popup) return;
    if (pathname?.startsWith('/admin')) return;
    if (pathname === '/plans' || pathname === '/login') return; // don't nag on the destination page

    try {
      const k = DISMISS_PREFIX + popup.id;
      const raw = localStorage.getItem(k);
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < REMIND_AFTER_DAYS * 86400000) return;
      }
    } catch {}

    const t = setTimeout(() => {
      setMountId(popup.id);
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [popup, pathname]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try { localStorage.setItem(DISMISS_PREFIX + (mountId || popup?.id), String(Date.now())); } catch {}
    setOpen(false);
  }

  if (!open || !popup) return null;

  const grad = variantClass(popup.variant);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
      <button
        aria-label="Close offer"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={popup.title}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[var(--bg)] shadow-2xl"
        style={{ animation: 'fade-up .35s ease-out both' }}
      >
        {/* Hero gradient */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${grad} px-6 py-8 text-white`}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

          {popup.dismissible && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
            </button>
          )}

          {popup.discount_label && (
            <div className="relative inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/30 backdrop-blur">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
              {popup.discount_label}
            </div>
          )}

          <h2 className="relative mt-3 text-2xl font-bold leading-tight tracking-tight">
            {popup.title}
          </h2>
          {popup.subtitle && (
            <p className="relative mt-2 text-sm leading-relaxed opacity-95">
              {popup.subtitle}
            </p>
          )}
        </div>

        {/* Body / CTA */}
        <div className="px-6 py-5">
          <ul className="space-y-2 text-sm text-[var(--fg)]">
            <Bullet>Direct-to-owner contact — zero broker cut</Bullet>
            <Bullet>Verified listings across Jaipur</Bullet>
            <Bullet>Move in within one day on average</Bullet>
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {popup.cta_label && popup.cta_href && (
              <Link
                href={popup.cta_href}
                onClick={dismiss}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:brightness-110"
              >
                {popup.cta_label}
                <svg viewBox="0 0 24 24" className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--fg)]"
            >
              Maybe later
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-[var(--subtle)]">
            You can review every plan on the Plans page before paying.
          </p>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
      </span>
      <span className="text-[13px]">{children}</span>
    </li>
  );
}
