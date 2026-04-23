'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { apiGet, apiPost } from '@/lib/api';
import PropertyWizard from './_components/PropertyWizard';
import PropertyEditModal from './_components/PropertyEditModal';
import DeleteConfirmModal from './_components/DeleteConfirmModal';
import Pagination from '../_components/Pagination';

const RETENTION_DAYS = 90;
const PAGE_SIZE = 15;

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [sub, setSub] = useState(null);
  const [myProps, setMyProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const reload = useCallback(async () => {
    const me = await apiGet('/api/me', { auth: true });
    setProfile(me.profile);
    setSub(me.subscription);
    if (me.profile?.role === 'owner') {
      const r = await apiGet(`/api/properties?mine=1&limit=200`, { auth: true });
      setMyProps(r.properties || []);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) { router.push('/login'); return; }
      try { await reload(); } finally { setLoading(false); }
    });
  }, [router, reload]);

  if (loading) return <DashboardSkeleton />;
  if (!profile) return <div className="mx-auto max-w-5xl px-4 py-12 text-[var(--muted)]">Profile not found.</div>;

  return profile.role === 'owner'
    ? <OwnerDashboard profile={profile} props={myProps} onReload={reload} />
    : <RenterDashboard profile={profile} sub={sub} />;
}

function OwnerDashboard({ profile, props, onReload }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [listingsPage, setListingsPage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);

  const live = props.filter((p) => !p.deleted_at && p.is_active);
  const paused = props.filter((p) => !p.deleted_at && !p.is_active);
  const deleted = props.filter((p) => p.deleted_at);

  // Live listings come first, then paused. Slice into a page window.
  const activeListings = useMemo(() => [...live, ...paused], [live, paused]);
  const pagedListings = useMemo(
    () => activeListings.slice((listingsPage - 1) * PAGE_SIZE, listingsPage * PAGE_SIZE),
    [activeListings, listingsPage],
  );
  const pagedDeleted = useMemo(
    () => deleted.slice((deletedPage - 1) * PAGE_SIZE, deletedPage * PAGE_SIZE),
    [deleted, deletedPage],
  );

  async function togglePause(p) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/properties/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      onReload?.();
    } catch (e) { console.error(e); }
  }

  async function restore(p) {
    try {
      await apiPost(`/api/properties/${p.id}/restore`, {});
      onReload?.();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-8 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 sm:py-1 sm:text-[11px]">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 10l9-7 9 7M5 10v10h14V10"/></svg>
            Owner
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">Hi, {profile.name || profile.email.split('@')[0]}</h1>
          <p className="mt-0.5 text-xs text-[var(--muted)] sm:mt-1 sm:text-sm">Manage your rooms and respond to renter chats.</p>
        </div>
        <Link href="/chat" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold transition hover:border-indigo-400 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Inbox
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-4">
        <MetricCard
          label="Live listings"
          value={live.length}
          hint={live.length === 0 ? 'Publish your first one →' : `Visible to renters right now`}
          icon="M3 10l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"
          tone="emerald"
        />
        <MetricCard
          label="Paused"
          value={paused.length}
          hint={paused.length === 0 ? 'None on hold' : 'Hidden until you resume'}
          icon="M10 9v6M14 9v6M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
          tone="amber"
        />
        <MetricCard
          label="Recently deleted"
          value={deleted.length}
          hint={deleted.length === 0 ? 'Nothing in trash' : 'Auto-removed after 90 days'}
          icon="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"
          tone="rose"
        />
      </div>

      <OwnerValueBanner />


      <div className="grid gap-8 lg:grid-cols-[1fr_520px]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your listings</h2>
            <span className="text-xs text-[var(--muted)]">{live.length + paused.length} active</span>
          </div>

          {live.length + paused.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10l9-7 9 7M5 10v10h14V10"/></svg>
              </div>
              <div className="mt-3 text-sm font-semibold">No listings yet</div>
              <p className="mt-1 text-xs text-[var(--muted)]">Use the form on the right to publish your first property.</p>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-2.5">
                {pagedListings.map((p) => (
                  <PropertyRow
                    key={p.id} p={p}
                    onEdit={() => setEditing(p)}
                    onDelete={() => setDeleting(p)}
                    onTogglePause={() => togglePause(p)}
                  />
                ))}
              </ul>
              <Pagination
                page={listingsPage}
                total={activeListings.length}
                pageSize={PAGE_SIZE}
                onChange={setListingsPage}
              />
            </>
          )}

          {deleted.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Recently deleted</h2>
                <span className="text-xs text-[var(--muted)]">Auto-removed after 90 days · {deleted.length} total</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {pagedDeleted.map((p) => <DeletedRow key={p.id} p={p} onRestore={() => restore(p)} />)}
              </ul>
              <Pagination
                page={deletedPage}
                total={deleted.length}
                pageSize={PAGE_SIZE}
                onChange={setDeletedPage}
              />
            </section>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Add a property</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">Three quick steps.</p>
          <PropertyWizard onCreated={onReload} />
        </section>
      </div>

      {editing && (
        <PropertyEditModal
          property={editing}
          onClose={() => setEditing(null)}
          onSaved={() => onReload?.()}
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          property={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => onReload?.()}
        />
      )}
    </div>
  );
}

function PropertyRow({ p, onEdit, onDelete, onTogglePause }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <li className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-indigo-400/50 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/property/${p.id}`} className="font-semibold tracking-tight transition group-hover:text-indigo-500 line-clamp-1">
              {p.title}
            </Link>
            <StatusBadge active={p.is_active} />
          </div>
          <div className="mt-0.5 text-sm text-[var(--muted)]">
            {p.locality}, {p.city} · <span className="text-indigo-500 font-semibold">₹{p.rent.toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
            {p.room_type && <Tag>{p.room_type.toUpperCase()}</Tag>}
            {p.furnishing && <Tag>{p.furnishing}</Tag>}
            {p.tenant_type && <Tag>{p.tenant_type}</Tag>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z"/></svg>
            Edit
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label="More"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--fg)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onTogglePause(); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--elevated)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {p.is_active
                      ? <><path d="M10 9v6M14 9v6"/><circle cx="12" cy="12" r="9"/></>
                      : <><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4V8z" fill="currentColor"/></>}
                  </svg>
                  {p.is_active ? 'Pause listing' : 'Resume listing'}
                </button>
                <Link href={`/property/${p.id}`} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--elevated)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  View as renter
                </Link>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DeletedRow({ p, onRestore }) {
  const daysSince = Math.floor((Date.now() - new Date(p.deleted_at).getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, RETENTION_DAYS - daysSince);
  const expired = daysLeft === 0;
  const pct = Math.min(100, (daysSince / RETENTION_DAYS) * 100);
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 opacity-80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight line-clamp-1 text-[var(--muted)] line-through">{p.title}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${expired ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}>
              {expired ? 'Unavailable' : 'Deleted'}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">
            {p.locality}, {p.city}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <span>Deleted {daysSince} day{daysSince === 1 ? '' : 's'} ago</span>
            <span>·</span>
            <span className={expired ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
              {expired ? 'Permanently removed' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--elevated)]">
            <div className={`h-full rounded-full transition-all ${expired ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-red-500'}`} style={{ width: `${pct}%` }}/>
          </div>
        </div>
        {!expired && (
          <button onClick={onRestore}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Restore
          </button>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
      active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {active ? 'Live' : 'Paused'}
    </span>
  );
}

function Tag({ children }) {
  return <span className="rounded-full border border-[var(--border)] bg-[var(--elevated)] px-2 py-0.5">{children}</span>;
}

function RenterDashboard({ profile, sub }) {
  // Contacts usage
  const contactsTotal = (sub?.plans?.contacts_limit ?? null);
  const contactsRemaining = sub?.contacts_remaining;
  const unlimitedContacts = contactsTotal === null && !!sub;
  const contactsUsed = contactsTotal !== null ? contactsTotal - (contactsRemaining ?? 0) : 0;
  const contactsPct = contactsTotal ? Math.min(100, (contactsUsed / contactsTotal) * 100) : null;

  // Time usage — derived from plan duration + expires_at. Assumes the sub
  // was created (now + duration) before expires_at; we derive purchase date
  // from expires_at - duration_days for a precise progress bar.
  const now = Date.now();
  const expiresMs = sub ? new Date(sub.expires_at).getTime() : 0;
  const durationDays = sub?.plans?.duration_days || 30;
  const startMs = expiresMs - durationDays * 24 * 3600 * 1000;
  const totalMs = expiresMs - startMs;
  const elapsedMs = Math.max(0, Math.min(totalMs, now - startMs));
  const daysLeft = sub ? Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24))) : 0;
  const timePct = sub ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;
  const timeExpiringSoon = daysLeft > 0 && daysLeft <= 3;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-5 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 sm:py-1 sm:text-[11px]">
          Renter
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">Hi, {profile.name || profile.email.split('@')[0]}</h1>
        <p className="mt-0.5 text-xs text-[var(--muted)] sm:mt-1 sm:text-sm">Browse rooms, chat with owners, save favourites.</p>
      </header>

      <div className={`relative overflow-hidden rounded-2xl border p-4 sm:rounded-3xl sm:p-8 ${sub ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-[var(--surface)] to-fuchsia-50 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-fuchsia-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] sm:text-xs">Your plan</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold tracking-tight sm:text-2xl">{sub?.plans?.name || 'No active plan'}</div>
              {sub && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${timeExpiringSoon ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                  {timeExpiringSoon ? `expires in ${daysLeft}d` : 'active'}
                </span>
              )}
            </div>
            {sub ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)] sm:mt-2 sm:gap-x-4 sm:gap-y-1 sm:text-xs">
                <span>Purchased {new Date(startMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span>·</span>
                <span>Expires {new Date(expiresMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--muted)] sm:mt-2 sm:text-sm">Your first chat with any owner is free. Upgrade for unlimited contacts.</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {sub && (
              <Link
                href="/dashboard/plan"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold transition hover:border-indigo-400 hover:text-indigo-500 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs"
              >
                View usage
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
            )}
            <Link
              href="/plans"
              className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg sm:px-4 sm:py-2 sm:text-xs"
            >
              {sub ? 'Upgrade' : 'Browse plans'}
            </Link>
          </div>
        </div>

        {sub && (
          <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-5">
            <UsageBar
              label="Contacts used"
              left={unlimitedContacts ? '∞' : `${contactsUsed} / ${contactsTotal}`}
              right={unlimitedContacts ? 'Unlimited' : `${contactsRemaining ?? 0} left`}
              pct={unlimitedContacts ? null : contactsPct}
              tone={contactsPct !== null && contactsPct >= 85 ? 'rose' : 'indigo'}
            />
            <UsageBar
              label="Validity used"
              left={`${Math.min(durationDays, Math.ceil(elapsedMs / (24 * 3600 * 1000)))} / ${durationDays} days`}
              right={`${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              pct={timePct}
              tone={timeExpiringSoon ? 'amber' : 'emerald'}
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-4">
        <ActionCard href="/listings" title="Browse rooms" desc="Search by city or locality." icon="M21 21l-4.3-4.3 M11 19a8 8 0 100-16 8 8 0 000 16z" />
        <ActionCard href="/chat" title="My chats" desc="Continue conversations." icon="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </div>
    </div>
  );
}

function UsageBar({ label, left, right, pct, tone = 'indigo' }) {
  const bar = {
    indigo:  'bg-gradient-to-r from-indigo-500 to-fuchsia-500',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    amber:   'bg-gradient-to-r from-amber-500 to-orange-500',
    rose:    'bg-gradient-to-r from-rose-500 to-red-500',
  }[tone];
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        <span>{label}</span>
        <span className="text-[var(--fg)]">{right}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tracking-tight">{left}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
        {pct === null ? (
          <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500 opacity-40" />
        ) : (
          <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

function OwnerValueBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const rows = [
    ['Give the broker 1 month\'s rent', 'Keep 100% — Room30 is free to list'],
    ['Random callers knocking at 10pm', 'Plan-gated chats, schedule visits when you want'],
    ['Wait weeks for a serious renter', 'Verified renters reach out from day one'],
  ];

  return (
    <div className="relative mb-10 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-[var(--surface)] p-6 shadow-sm dark:border-emerald-500/25 dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-[var(--surface)] sm:p-7">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/80 text-[var(--muted)] transition hover:text-[var(--fg)]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>
        Why owners pick Room30
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
        The broker-free way to rent out your property.
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
        No To-Let boards, no commission, no time-wasters. Here&apos;s what changes once your listing is live.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {rows.map(([o, n], i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur">
            <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)] line-through decoration-[var(--border-strong)]">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </span>
              {o}
            </div>
            <div className="mt-2 flex items-start gap-2 text-sm font-semibold leading-relaxed text-[var(--fg)]">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              {n}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon, tone = 'indigo' }) {
  const tones = {
    indigo: {
      bg: 'from-indigo-50 via-white to-indigo-50/30 dark:from-indigo-500/10 dark:via-[var(--surface)] dark:to-indigo-500/5',
      ring: 'ring-indigo-200/60 dark:ring-indigo-500/20',
      chip: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20',
      dot: 'bg-indigo-500',
      accent: 'text-indigo-600 dark:text-indigo-300',
    },
    emerald: {
      bg: 'from-emerald-50 via-white to-teal-50/40 dark:from-emerald-500/10 dark:via-[var(--surface)] dark:to-teal-500/5',
      ring: 'ring-emerald-200/60 dark:ring-emerald-500/20',
      chip: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20',
      dot: 'bg-emerald-500',
      accent: 'text-emerald-600 dark:text-emerald-300',
    },
    amber: {
      bg: 'from-amber-50 via-white to-orange-50/40 dark:from-amber-500/10 dark:via-[var(--surface)] dark:to-orange-500/5',
      ring: 'ring-amber-200/60 dark:ring-amber-500/20',
      chip: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20',
      dot: 'bg-amber-500',
      accent: 'text-amber-600 dark:text-amber-300',
    },
    rose: {
      bg: 'from-rose-50 via-white to-[var(--surface)] dark:from-rose-500/10 dark:via-[var(--surface)] dark:to-rose-500/5',
      ring: 'ring-rose-200/60 dark:ring-rose-500/20',
      chip: 'bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-md shadow-rose-500/20',
      dot: 'bg-rose-500',
      accent: 'text-rose-600 dark:text-rose-300',
    },
  };
  const t = tones[tone] || tones.indigo;
  const zero = !value;

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} p-3 ring-1 ${t.ring} transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-60 blur-3xl" style={{ background: `radial-gradient(closest-side, var(--surface), transparent)` }} />

      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${t.dot}`} />
            <span className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-[10px] sm:tracking-[0.14em]">{label}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 sm:mt-3">
            <span className={`text-2xl font-semibold tracking-tight sm:text-4xl ${zero ? 'text-[var(--muted)]' : 'text-[var(--fg)]'}`}>
              {value}
            </span>
            {!zero && <span className={`hidden text-[11px] font-semibold sm:inline ${t.accent}`}>active</span>}
          </div>
          {hint && <div className="mt-1 hidden text-[11px] text-[var(--muted)] sm:mt-1.5 sm:block">{hint}</div>}
        </div>

        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${t.chip} transition group-hover:scale-[1.08] sm:h-10 sm:w-10 sm:rounded-xl`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
        </span>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon }) {
  return (
    <Link href={href} className="group flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-lg sm:gap-4 sm:p-5">
      <div>
        <div className="font-semibold tracking-tight">{title}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">{desc}</div>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--elevated)] text-[var(--muted)] transition group-hover:bg-indigo-500 group-hover:text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={icon}/></svg>
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--elevated)]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />
    </div>
  );
}
