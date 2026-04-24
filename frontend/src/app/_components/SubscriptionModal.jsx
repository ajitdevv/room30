'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabaseClient';

function loadRzp() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function freeChatsFor(priceInPaise) {
  const rupees = Math.round(priceInPaise / 100);
  if (rupees >= 199) return null;
  if (rupees >= 99) return 15;
  return 5;
}

export default function SubscriptionModal({
  open,
  onClose,
  onSuccess,
  reason = 'Unlock more contacts',
  title = 'Subscribe to continue',
}) {
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDone(false);
    setErr('');
    Promise.all([
      apiGet('/api/plans').then((r) => setPlans(r.plans || [])),
      supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)),
    ]).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  async function buy(plan) {
    setErr('');
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusyId(plan.id);
    try {
      const ok = await loadRzp();
      if (!ok) throw new Error("We couldn't load the payment checkout. Please check your connection and try again.");
      const { order, key_id } = await apiPost('/api/payments/order', { plan_id: plan.id });

      const rzp = new window.Razorpay({
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Room30',
        description: `${plan.name} plan`,
        prefill: { email: user.email },
        theme: { color: '#6366f1' },
        handler: async (resp) => {
          try {
            const verified = await apiPost('/api/payments/verify', { ...resp, plan_id: plan.id });
            if (!verified?.subscription?.id) throw new Error('activation_failed');
            setDone(true);
            setBusyId(null);
            // Give the DB a moment so the next API call sees the new subscription row.
            setTimeout(() => {
              onSuccess?.();
              onClose?.();
            }, 1800);
          } catch {
            setErr(`Your payment went through, but we couldn't activate your plan yet. Please contact support@room30.in with your payment ID: ${resp?.razorpay_payment_id || '—'}`);
            setBusyId(null);
          }
        },
        modal: { ondismiss: () => setBusyId(null) },
      });
      rzp.open();
    } catch (e) {
      setErr(friendlyError(e));
      setBusyId(null);
    }
  }

  if (!open) return null;

  const sorted = [...plans].sort((a, b) => a.price - b.price);
  const highlightId = sorted[Math.min(1, sorted.length - 1)]?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--fg)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 pt-10 pb-8 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: 'radial-gradient(500px 200px at 20% 0%, white, transparent 60%)' }} />
          <div className="relative inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {reason}
          </div>
          <h2 className="relative mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          <p className="relative mt-1 text-sm text-white/80">
            Pay once, use for the whole period. Cancel anytime.
          </p>
        </div>

        {/* Body */}
        {done ? (
          <div className="px-8 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-tight">Plan activated</div>
            <p className="mt-1 text-sm text-[var(--muted)]">You can now unlock contacts. Continuing…</p>
          </div>
        ) : loading ? (
          <div className="px-8 py-12">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
            </div>
          </div>
        ) : (
          <div className="px-6 py-6 sm:px-8">
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {sorted.map((p) => {
                const hl = p.id === highlightId;
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-2xl p-5 transition ${
                      hl
                        ? 'border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 via-[var(--surface)] to-fuchsia-50 shadow-lg shadow-indigo-500/10 dark:from-indigo-500/10 dark:to-fuchsia-500/10'
                        : 'border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-400/50'
                    }`}
                  >
                    {hl && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                        Most popular
                      </span>
                    )}

                    <div className="text-base font-semibold tracking-tight">{p.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {p.contacts_limit ? `${p.contacts_limit} contacts` : 'Unlimited'} · {p.duration_days} days
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">₹{Math.round(p.price / 100)}</span>
                      <span className="text-xs text-[var(--muted)]">/mo</span>
                    </div>

                    <ul className="mt-4 space-y-1.5 text-xs text-[var(--fg)]/80">
                      <li className="flex items-start gap-1.5">
                        <IconCheck />
                        {(() => {
                          const fc = freeChatsFor(p.price);
                          return fc === null ? 'Unlimited free chats' : `${fc} free chats included`;
                        })()}
                      </li>
                      <li className="flex items-start gap-1.5">
                        <IconCheck /> Unlock verified owner phones
                      </li>
                      <li className="flex items-start gap-1.5">
                        <IconCheck /> Priority inbox placement
                      </li>
                      {!p.contacts_limit && (
                        <li className="flex items-start gap-1.5">
                          <IconCheck /> Unlimited contacts
                        </li>
                      )}
                    </ul>

                    <button
                      onClick={() => buy(p)}
                      disabled={busyId === p.id}
                      className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 ${
                        hl
                          ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30'
                          : 'bg-[var(--fg)] text-[var(--bg)] hover:opacity-90'
                      }`}
                    >
                      {busyId === p.id ? (
                        <span className="flex items-center justify-center gap-1.5"><Spinner /> Opening…</span>
                      ) : (
                        `Pay ₹${Math.round(p.price / 100)}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5"><IconShield className="h-3 w-3"/> Secure checkout via Razorpay</span>
              <span className="inline-flex items-center gap-1.5">
                <IconRefresh className="h-3 w-3"/>
                30-day refund
                <Link href="/refund-policy" target="_blank" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">(conditions)</Link>
              </span>
              <span className="inline-flex items-center gap-1.5"><IconLock className="h-3 w-3"/> We never store your card</span>
            </div>

            <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>Heads up:</strong> once you unlock any owner&apos;s contact using this plan, it counts as used and is no longer refundable.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconShield(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z"/></svg>; }
function IconRefresh(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>; }
function IconLock(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/>
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
