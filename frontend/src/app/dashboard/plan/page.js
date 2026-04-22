'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import Pagination from '../../_components/Pagination';

const PAGE_SIZE = 15;

export default function PlanUsagePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) { router.push('/login?next=/dashboard/plan'); return; }
      try {
        const r = await apiGet('/api/me/plan-usage', { auth: true });
        if (alive) setData(r);
      } catch (e) { if (alive) setErr(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [router]);

  if (loading) return <Skeleton />;
  if (err) return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>
    </div>
  );

  const sub = data?.subscription;
  const unlocks = data?.unlocked_contacts || [];
  const history = data?.history || [];
  // `data.now` is the server's clock at fetch time — avoids tz mismatches
  // and the react-hooks/purity lint complaint about calling Date.now() in render.
  const now = data?.now ? new Date(data.now).getTime() : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <Link href="/dashboard" className="transition hover:text-[var(--fg)]">Dashboard</Link>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
        <span className="text-[var(--fg)]">Plan & usage</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Plan & usage</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Track validity, unlocked contacts, and past subscriptions.</p>
        </div>
        <Link
          href="/plans"
          className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg"
        >
          {sub ? 'Upgrade or extend' : 'Browse plans'}
        </Link>
      </header>

      {sub ? <ActivePlanCard sub={sub} now={now} unlockCount={unlocks.filter((u) => isActiveSubUnlock(u, sub)).length} />
           : <NoPlanCard />}

      <UnlockedContacts unlocks={unlocks} />

      <SubscriptionHistory history={history} now={now} />

      <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-xs text-[var(--muted)]">
        Need help or think something looks wrong?{' '}
        <a href="mailto:support@room30.in" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">support@room30.in</a>
        {' · '}
        <Link href="/refund-policy" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">Refund policy</Link>
      </div>
    </div>
  );
}

function ActivePlanCard({ sub, now, unlockCount }) {
  const contactsTotal = sub?.plans?.contacts_limit ?? null;
  const contactsRemaining = sub?.contacts_remaining;
  const unlimitedContacts = contactsTotal === null;
  const contactsUsed = unlimitedContacts ? unlockCount : contactsTotal - (contactsRemaining ?? 0);
  const contactsPct = unlimitedContacts ? null : Math.min(100, (contactsUsed / Math.max(1, contactsTotal)) * 100);

  const expiresMs = new Date(sub.expires_at).getTime();
  const durationDays = sub?.plans?.duration_days || 30;
  const startMs = expiresMs - durationDays * 24 * 3600 * 1000;
  const totalMs = expiresMs - startMs;
  const elapsedMs = Math.max(0, Math.min(totalMs, now - startMs));
  const daysLeft = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
  const timePct = Math.min(100, (elapsedMs / totalMs) * 100);
  const expiringSoon = daysLeft > 0 && daysLeft <= 3;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-[var(--surface)] to-fuchsia-50 p-6 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-fuchsia-500/10 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Active
            </span>
            {expiringSoon && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Expires in {daysLeft}d
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{sub.plans?.name} plan</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Paid ₹{Math.round((sub.plans?.price || 0) / 100).toLocaleString('en-IN')} ·{' '}
            Purchased {new Date(startMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
            Valid till {new Date(expiresMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {sub.razorpay_payment_id && (
            <div className="mt-1 text-[11px] text-[var(--muted)]">Payment ID: <span className="font-mono">{sub.razorpay_payment_id}</span></div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <BigBar
          label="Contacts"
          primary={unlimitedContacts ? `${contactsUsed} used` : `${contactsUsed} / ${contactsTotal}`}
          secondary={unlimitedContacts ? 'Unlimited' : `${contactsRemaining ?? 0} remaining`}
          pct={contactsPct}
          tone={contactsPct !== null && contactsPct >= 85 ? 'rose' : 'indigo'}
        />
        <BigBar
          label="Validity"
          primary={`${Math.min(durationDays, Math.ceil(elapsedMs / (24 * 3600 * 1000)))} / ${durationDays} days`}
          secondary={`${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          pct={timePct}
          tone={expiringSoon ? 'amber' : 'emerald'}
        />
      </div>
    </section>
  );
}

function NoPlanCard() {
  return (
    <section className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div className="mt-3 text-lg font-semibold">No active plan</div>
      <p className="mt-1 text-sm text-[var(--muted)]">Your first chat with any owner is still free. Upgrade when you want to unlock more contacts.</p>
      <Link href="/plans" className="mt-4 inline-flex rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg">
        See plans
      </Link>
    </section>
  );
}

function UnlockedContacts({ unlocks }) {
  const revealed = unlocks.filter((u) => u.phone_revealed_at);
  const chatOnly = unlocks.filter((u) => !u.phone_revealed_at);

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Unlocked contacts</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Every owner you&apos;ve revealed a phone number for, or started a chat with.</p>
        </div>
        <span className="rounded-full bg-[var(--elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
          {unlocks.length} total
        </span>
      </div>

      {unlocks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
          You haven&apos;t unlocked any owner contacts yet.
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {revealed.length > 0 && (
            <UnlockGroup
              title="Phone revealed"
              desc="These count toward your plan's contact quota and make your plan non-refundable."
              tone="rose"
              items={revealed}
            />
          )}
          {chatOnly.length > 0 && (
            <UnlockGroup
              title="Chat only"
              desc="You've messaged these owners but haven't revealed their phone number yet."
              tone="indigo"
              items={chatOnly}
            />
          )}
        </div>
      )}
    </section>
  );
}

function UnlockGroup({ title, desc, tone, items }) {
  const [page, setPage] = useState(1);
  const paged = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );
  const pill = {
    rose:    'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    indigo:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
  }[tone];
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {title}
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pill}`}>
            {items.length}
          </span>
        </h3>
      </div>
      <p className="text-[11px] text-[var(--muted)]">{desc}</p>

      <ul className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {paged.map((u) => {
          const at = u.phone_revealed_at || u.created_at;
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-semibold text-white">
                {(u.owner?.name || u.owner?.email || 'O').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-semibold">
                  {u.owner?.name?.trim() || u.owner?.email || 'Owner'}
                </div>
                {u.property ? (
                  <Link
                    href={`/property/${u.property.id}`}
                    className="mt-0.5 block line-clamp-1 text-[11px] text-[var(--muted)] transition hover:text-indigo-500"
                  >
                    {u.property.title} · #{u.property.listing_number ?? '—'} · {u.property.locality}, {u.property.city}
                  </Link>
                ) : (
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">No property attached</div>
                )}
              </div>
              <div className="text-right text-[11px] text-[var(--muted)]">
                {new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                <div>{new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} total={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

function SubscriptionHistory({ history, now }) {
  const [page, setPage] = useState(1);
  const paged = useMemo(
    () => history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [history, page],
  );
  if (!history.length) return null;
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Subscription history</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Everything you&apos;ve paid for on Room30.</p>
        </div>
        <span className="rounded-full bg-[var(--elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
          {history.length} subscription{history.length === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {paged.map((s) => {
          const expiresMs = new Date(s.expires_at).getTime();
          const active = expiresMs > now;
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.plans?.name || 'Plan'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}>
                    {active ? 'Active' : 'Expired'}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  ₹{Math.round((s.plans?.price || 0) / 100).toLocaleString('en-IN')} ·{' '}
                  {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' → '}
                  {new Date(expiresMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {s.razorpay_payment_id && (
                  <div className="mt-0.5 text-[10px] text-[var(--muted)]">Payment: <span className="font-mono">{s.razorpay_payment_id}</span></div>
                )}
              </div>
              <div className="text-right text-[11px] text-[var(--muted)]">
                {s.plans?.contacts_limit === null || s.plans?.contacts_limit === undefined
                  ? 'Unlimited contacts'
                  : `${s.plans.contacts_limit} contacts`}
                <div>{s.contacts_remaining ?? '∞'} left</div>
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} total={history.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </section>
  );
}

function BigBar({ label, primary, secondary, pct, tone }) {
  const bar = {
    indigo:  'bg-gradient-to-r from-indigo-500 to-fuchsia-500',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    amber:   'bg-gradient-to-r from-amber-500 to-orange-500',
    rose:    'bg-gradient-to-r from-rose-500 to-red-500',
  }[tone] || 'bg-gradient-to-r from-indigo-500 to-fuchsia-500';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight">{primary}</span>
        <span className="text-xs text-[var(--muted)]">{secondary}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
        {pct === null ? (
          <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500 opacity-50" />
        ) : (
          <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

function isActiveSubUnlock(unlock, sub) {
  const unlockTs = new Date(unlock.phone_revealed_at || unlock.created_at).getTime();
  const subCreated = new Date(sub.created_at || 0).getTime();
  return unlockTs >= subCreated;
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--elevated)]" />
      <div className="mt-6 h-48 animate-pulse rounded-3xl bg-[var(--elevated)]" />
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />
    </div>
  );
}
