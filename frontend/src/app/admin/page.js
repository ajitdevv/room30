'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { LineChart, BarList } from './_components/Charts';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [signups, setSignups] = useState([]);
  const [listings, setListings] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, c1, c2, c3, a, r] = await Promise.all([
          apiGet('/api/admin/stats', { auth: true }),
          apiGet('/api/admin/chart?metric=signups&range=30', { auth: true }),
          apiGet('/api/admin/chart?metric=listings&range=30', { auth: true }),
          apiGet('/api/admin/chart?metric=revenue&range=30', { auth: true }),
          apiGet('/api/admin/audit?pageSize=5', { auth: true }).catch(() => ({ entries: [] })),
          apiGet('/api/admin/reports?status=open&pageSize=5', { auth: true }).catch(() => ({ reports: [] })),
        ]);
        if (!alive) return;
        setStats(s);
        setSignups(c1.series || []);
        setListings(c2.series || []);
        setRevenue((c3.series || []).map((p) => ({ ...p, value: Math.round((p.value || 0) / 100) })));
        setRecentAudit(a.entries || []);
        setRecentReports(r.reports || []);
      } catch (e) { setErr(friendlyError(e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <OverviewSkeleton />;
  if (err) return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>;

  const revRupees = Math.round((stats?.subscriptions?.revenue_paise || 0) / 100);

  return (
    <div>
      <header className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Dashboard</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Everything happening across Room30 at a glance.</p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total users"    value={stats.users.total}    hint={`+${stats.users.new_7d} this week`}   tone="indigo" />
        <Tile label="Owners"         value={stats.users.owners}   hint={`${stats.users.admins} admins`}        tone="emerald" />
        <Tile label="Live listings"  value={stats.properties.live} hint={`+${stats.properties.new_7d} this week`} tone="sky" />
        <Tile label="Revenue (₹)"    value={revRupees}            hint={`${stats.subscriptions.active} active plans`} tone="amber" />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <LineChart series={signups}  label="New signups (30d)"  color="#6366f1" />
        <LineChart series={listings} label="New listings (30d)" color="#10b981" />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <LineChart series={revenue} label="Revenue (₹, 30d)" color="#f59e0b" />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Needs attention</div>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              {stats.reports.open} open
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            <Link href="/admin/reports" className="block rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm transition hover:border-indigo-400/60">
              <div className="font-semibold">Open complaints</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">Review renter reports on listings</div>
            </Link>
            <Link href="/admin/listings?status=paused" className="block rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm transition hover:border-indigo-400/60">
              <div className="font-semibold">Paused listings</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">Listings hidden from browse</div>
            </Link>
            <Link href="/admin/users?role=admin" className="block rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm transition hover:border-indigo-400/60">
              <div className="font-semibold">Admin team ({stats.users.admins})</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">Manage who can access this dashboard</div>
            </Link>
          </ul>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recent admin actions</div>
            <Link href="/admin/audit" className="text-[11px] font-semibold text-indigo-500 hover:underline">View all</Link>
          </div>
          {recentAudit.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--muted)]">No admin actions yet.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentAudit.map((e) => <AuditRow key={e.id} entry={e} compact />)}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Latest open reports</div>
            <Link href="/admin/reports" className="text-[11px] font-semibold text-indigo-500 hover:underline">View all</Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--muted)]">All caught up — no open complaints.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentReports.map((r) => (
                <li key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                      {r.reason}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold line-clamp-1">
                    {r.properties?.title || '—'}
                  </div>
                  {r.description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{r.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, hint, tone = 'indigo' }) {
  const tones = {
    indigo:  { bg: 'from-indigo-500/10 to-violet-500/5',  dot: 'bg-indigo-500'  },
    emerald: { bg: 'from-emerald-500/10 to-teal-500/5',   dot: 'bg-emerald-500' },
    sky:     { bg: 'from-sky-500/10 to-cyan-500/5',       dot: 'bg-sky-500'     },
    amber:   { bg: 'from-amber-500/10 to-orange-500/5',   dot: 'bg-amber-500'   },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-gradient-to-br ${t.bg} p-4`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{Number(value || 0).toLocaleString('en-IN')}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

export function AuditRow({ entry, compact = false }) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          {entry.action}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          {new Date(entry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        {!compact && <span className="ml-auto text-[11px] text-[var(--muted)]">by {entry.admin_name || entry.admin_email || '—'}</span>}
      </div>
      <div className="mt-1.5 text-sm">{entry.summary || `${entry.entity_type} ${entry.entity_id || ''}`}</div>
      {compact && <div className="mt-0.5 text-[11px] text-[var(--muted)]">by {entry.admin_name || entry.admin_email || '—'}</div>}
    </li>
  );
}

function OverviewSkeleton() {
  return (
    <div>
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-[var(--elevated)]" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />
      </div>
    </div>
  );
}
