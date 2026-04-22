'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

function loadRzp() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Free-chat allowance keyed on plan price (paise).
// ₹49 → 5 free chats · ₹99 → 15 · ₹199+ → unlimited.
function freeChatsFor(priceInPaise) {
  const rupees = Math.round(priceInPaise / 100);
  if (rupees >= 199) return null; // unlimited
  if (rupees >= 99) return 15;
  return 5;
}

function formatFreeChats(n) {
  return n === null ? 'Unlimited free chats' : `${n} free chats`;
}

const BASE_PERKS = [
  'Unlock verified owner phone numbers',
  'Priority placement in owner inbox',
  'Save listings to your wishlist',
  'Email alerts for new matching rooms',
  'Zero brokerage — ever',
];

const TIER_THEME = [
  {
    key: 'basic',
    ring: 'ring-1 ring-sky-200/60 dark:ring-sky-400/20',
    bg: 'bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-sky-500/10 dark:via-[var(--surface)] dark:to-cyan-500/5',
    badge: 'from-sky-500 to-cyan-500',
    glow: 'shadow-sky-500/10',
  },
  {
    key: 'standard',
    ring: 'ring-2 ring-indigo-500',
    bg: 'bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-indigo-500/10 dark:via-[var(--surface)] dark:to-fuchsia-500/10',
    badge: 'from-indigo-600 to-fuchsia-600',
    glow: 'shadow-indigo-500/20',
  },
  {
    key: 'pro',
    ring: 'ring-1 ring-amber-200/60 dark:ring-amber-400/20',
    bg: 'bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-amber-500/10 dark:via-[var(--surface)] dark:to-rose-500/10',
    badge: 'from-amber-500 via-orange-500 to-rose-500',
    glow: 'shadow-amber-500/10',
  },
];

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const [billing, setBilling] = useState('monthly');
  const router = useRouter();

  useEffect(() => {
    apiGet('/api/plans').then((r) => setPlans(r.plans || []));
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function buy(plan) {
    setErr('');
    if (!user) { router.push('/login?next=/plans'); return; }
    setBusyId(plan.id);
    try {
      const ok = await loadRzp();
      if (!ok) throw new Error('Failed to load Razorpay');
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
            await apiPost('/api/payments/verify', { ...resp, plan_id: plan.id });
            router.push('/dashboard');
          } catch (e) { setErr(e.message); }
        },
        modal: { ondismiss: () => setBusyId(null) },
      });
      rzp.open();
    } catch (e) {
      setErr(e.message);
      setBusyId(null);
    }
  }

  const sorted = [...plans].sort((a, b) => a.price - b.price);
  const midIndex = Math.min(1, sorted.length - 1);

  return (
    <div>
      <section className="bg-aurora bg-noise relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-10 text-center sm:px-6 sm:pb-12 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-[11px] font-medium text-[var(--muted)] backdrop-blur sm:text-xs">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Chat subscription
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-5xl">
            First chat free.{' '}
            <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 bg-clip-text text-transparent">Upgrade when you&apos;re ready.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)] sm:mt-4 sm:text-base">
            Every paid plan now comes with free chats built-in. Pay once, use for the whole period. Cancel anytime.
          </p>

          <div className="mx-auto mt-5 grid max-w-3xl gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3">
            <HeroBullet icon="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" t="Free chats included" d="5, 15 or unlimited per plan" />
            <HeroBullet icon="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z" t="Verified owners" d="Every number is checked" />
            <HeroBullet icon="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" t="30-day refund" d="If you haven't unlocked any contact" />
          </div>

          <div className="mt-5 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-semibold sm:mt-8">
            {['monthly', 'quarterly'].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`relative rounded-full px-3.5 py-1.5 capitalize transition sm:px-4 ${billing === b ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)]'}`}
              >
                {b}
                {b === 'quarterly' && <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">-15%</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 sm:pb-20">
        {err && <div className="mx-auto mb-4 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 sm:mb-6">{err}</div>}

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          {sorted.map((p, i) => {
            const highlight = i === midIndex;
            const theme = TIER_THEME[i] || TIER_THEME[0];
            const displayPrice = billing === 'quarterly' ? Math.round((p.price * 3) * 0.85) : p.price;
            const freeChats = freeChatsFor(p.price);
            const contactsLabel = p.contacts_limit ? `${p.contacts_limit} contacts` : 'Unlimited contacts';

            const perks = [
              `${formatFreeChats(freeChats)} on every unlock`,
              ...BASE_PERKS.slice(0, p.contacts_limit ? 3 : 5),
            ];

            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 sm:rounded-3xl sm:p-7 ${theme.bg} ${theme.ring} ${highlight ? `shadow-2xl ${theme.glow}` : 'shadow-sm'}`}
              >
                {highlight && (
                  <span className={`absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r ${theme.badge} px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg sm:text-[11px]`}>
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M12 .587l3.668 7.431L24 9.75l-6 5.85 1.416 8.267L12 19.771l-7.416 4.096L6 15.6 0 9.75l8.332-1.732z"/></svg>
                    Most popular
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold tracking-tight sm:text-lg">{p.name}</div>
                  {freeChats === null && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Best value
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
                  {contactsLabel} · {billing === 'quarterly' ? `${p.duration_days * 3}` : p.duration_days} days
                </div>

                <div className="mt-4 flex items-baseline gap-1 sm:mt-6 sm:gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight sm:text-5xl">₹{Math.round(displayPrice / 100)}</span>
                  <span className="text-xs text-[var(--muted)] sm:text-sm">/{billing === 'quarterly' ? 'qtr' : 'mo'}</span>
                </div>
                {billing === 'quarterly' && (
                  <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Save ₹{Math.round((p.price * 3 - displayPrice) / 100)} vs monthly
                  </div>
                )}

                <div className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-gradient-to-r ${theme.badge} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm sm:mt-5 sm:px-3 sm:text-[11px]`}>
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  {formatFreeChats(freeChats)}
                </div>

                <button
                  onClick={() => buy(p)}
                  disabled={busyId === p.id}
                  className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50 bg-gradient-to-br sm:mt-6 sm:py-3 ${theme.badge} shadow-lg ${theme.glow} hover:brightness-110`}
                >
                  {busyId === p.id ? 'Opening…' : `Choose ${p.name}`}
                </button>

                <ul className="mt-4 space-y-2 text-[13px] sm:mt-7 sm:space-y-3 sm:text-sm">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-[var(--fg)]/90">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Comparison strip */}
        <div className="mt-10 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-indigo-50/40 dark:to-indigo-500/5 p-5 sm:mt-16 sm:rounded-3xl sm:p-8">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            <Reason
              t="30-day refund window"
              d={<>Refundable within 30 days <strong>only if no owner contact has been unlocked yet.</strong> <Link href="/refund-policy" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">Read policy</Link></>}
              icon="M3 12a9 9 0 1018 0 9 9 0 00-18 0z M12 7v5l3 3"
            />
            <Reason t="Encrypted payments" d="Payments processed by Razorpay. We never see your card details." icon="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z"/>
            <Reason t="Human support" d="Real humans, 7 days a week. Average response under 2 hours." icon="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-10 sm:mt-16">
          <h2 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">Plan FAQ</h2>
          <div className="mx-auto mt-4 max-w-2xl space-y-2 sm:mt-6">
            {[
              ['How do free chats work?', 'Each paid plan includes a bundle of free chats — 5 on the ₹49 plan, 15 on the ₹99 plan, and unlimited on the ₹199 plan. Free chats never expire while your plan is active.'],
              ['Can I change plans later?', 'Yes — buy any plan anytime. Unused contacts and free chats from previous plans stay available while valid.'],
              ['What counts as a contact?', 'Each unique owner you unlock counts as one contact. Further chats with the same owner are free.'],
              ['Refund policy?', <>Full refund within 30 days — <strong>only if you haven&apos;t unlocked any owner&apos;s contact yet</strong>. The moment you click &ldquo;Show contact number&rdquo; on any listing, the plan is treated as used and no refund will be issued. See the <Link href="/refund-policy" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">full refund policy</Link>.</>],
            ].map(([q, a], i) => <Faq key={i} q={q} a={a} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroBullet({ icon, t, d }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 text-left backdrop-blur">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-600 dark:text-indigo-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-tight">{t}</div>
        <div className="text-[11px] text-[var(--muted)]">{d}</div>
      </div>
    </div>
  );
}

function Reason({ t, d, icon }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-indigo-600 dark:text-indigo-300">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      </div>
      <div>
        <div className="font-semibold">{t}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">{d}</div>
      </div>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border transition ${open ? 'border-indigo-400/60' : 'border-[var(--border)]'} bg-[var(--surface)]`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-semibold">{q}</span>
        <span className={`transition ${open ? 'rotate-180 text-indigo-500' : 'text-[var(--muted)]'}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </button>
      {open && <div className="px-5 pb-5 text-sm text-[var(--muted)]">{a}</div>}
    </div>
  );
}
