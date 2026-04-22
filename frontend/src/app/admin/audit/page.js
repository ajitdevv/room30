'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Pagination from '../_components/Pagination';
import { Header } from '../users/page';

const ENTITY_ICONS = {
  property: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  report:   'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
  review:   'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z',
  plan:     'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  user:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
};

export default function AuditPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const pageSize = 15;

  useEffect(() => { setPage(1); }, [entity]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page, pageSize });
    if (entity) params.set('entity', entity);
    apiGet(`/api/admin/audit?${params.toString()}`, { auth: true })
      .then((r) => {
        if (!alive) return;
        setEntries(r.entries || []);
        setTotal(r.total || 0);
        setNotice(r.notice || '');
        setErr('');
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, entity]);

  return (
    <div>
      <Header title="Audit log" subtitle="Every change made through the admin dashboard." count={total} />

      <div className="mb-4 inline-flex flex-wrap gap-1 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs font-semibold">
        {['', 'user', 'property', 'report', 'review', 'plan'].map((v) => (
          <button
            key={v || 'all'}
            onClick={() => setEntity(v)}
            className={`rounded-full px-3 py-1.5 capitalize transition ${
              entity === v ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            {v || 'All'}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      {notice && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <div>
            <div className="font-semibold">Audit log not set up yet</div>
            <div className="mt-0.5 text-xs leading-relaxed opacity-90">
              {notice} Open Supabase → SQL editor and run <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-[11px]">schema_patches/09_admin_audit.sql</code>, then refresh this page.
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--elevated)]" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">No admin actions recorded in this view.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 sm:px-5">
                <button
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-600 dark:text-indigo-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ENTITY_ICONS[e.entity_type] || ENTITY_ICONS.user} />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                        {e.action}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">{e.summary || `${e.entity_type} ${e.entity_id || ''}`}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">by {e.admin_name || e.admin_email || '—'}</div>
                  </div>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 text-[var(--muted)] transition ${expanded === e.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </button>

                {expanded === e.id && (
                  <div className="mt-3 grid gap-2 rounded-xl bg-[var(--bg)] p-3 text-[11px] sm:grid-cols-2">
                    <Snapshot label="Before" data={e.before_data} />
                    <Snapshot label="After"  data={e.after_data} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}

function Snapshot({ label, data }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-[var(--elevated)] p-2 font-mono text-[10px] leading-snug">
        {data ? JSON.stringify(data, null, 2) : '—'}
      </pre>
    </div>
  );
}
