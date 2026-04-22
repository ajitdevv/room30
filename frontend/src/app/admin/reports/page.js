'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Pagination from '../_components/Pagination';
import { Header } from '../users/page';

const STATUS_COPY = {
  open:      { label: 'Open',      cls: 'bg-red-500/10 text-red-600 dark:text-red-300' },
  reviewed:  { label: 'Reviewed',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  resolved:  { label: 'Resolved',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  dismissed: { label: 'Dismissed', cls: 'bg-[var(--elevated)] text-[var(--muted)]' },
};

export default function ReportsAdminPage() {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded bg-[var(--elevated)]" />}>
      <ReportsAdmin />
    </Suspense>
  );
}

function ReportsAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(sp.get('status') || 'open');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => { setPage(1); }, [status]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page, pageSize, status });
    apiGet(`/api/admin/reports?${params.toString()}`, { auth: true })
      .then((r) => {
        if (!alive) return;
        setItems(r.reports || []);
        setTotal(r.total || 0);
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, status]);

  async function updateStatus(r, newStatus) {
    setBusyId(r.id);
    setErr('');
    try {
      await apiPatch(`/api/admin/reports/${r.id}`, { status: newStatus }, { auth: true });
      setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x));
    } catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <Header title="Complaints" subtitle="Renter reports against listings." count={total} />

      <div className="mb-4 inline-flex overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs font-semibold">
        {['open', 'reviewed', 'resolved', 'dismissed', 'all'].map((v) => (
          <button
            key={v}
            onClick={() => {
              setStatus(v);
              const params = new URLSearchParams(sp.toString());
              if (v === 'all') params.delete('status'); else params.set('status', v);
              router.replace(`/admin/reports?${params.toString()}`);
            }}
            className={`rounded-full px-3 py-1.5 capitalize transition ${
              status === v ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No reports in this bucket.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">{r.reason}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${STATUS_COPY[r.status]?.cls || ''}`}>
                  {STATUS_COPY[r.status]?.label || r.status}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="mt-2 text-sm">
                <div className="font-semibold">
                  {r.properties ? (
                    <Link href={`/property/${r.properties.id}`} target="_blank" className="hover:text-indigo-500">
                      {r.properties.title} <span className="text-[var(--muted)]">#{r.properties.listing_number ?? '—'}</span>
                    </Link>
                  ) : '— listing gone —'}
                </div>
                {r.properties && <div className="text-[11px] text-[var(--muted)]">{r.properties.locality}, {r.properties.city}</div>}
              </div>

              {r.description && <p className="mt-2 text-sm text-[var(--muted)]">{r.description}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-[11px] text-[var(--muted)]">
                  Reported by <span className="font-semibold text-[var(--fg)]">{r.profiles?.name?.trim() || r.profiles?.email || '—'}</span>
                </span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {['reviewed', 'resolved', 'dismissed'].filter((s) => s !== r.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(r, s)}
                      disabled={busyId === r.id}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold capitalize transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                    >
                      Mark {s}
                    </button>
                  ))}
                  {r.status !== 'open' && (
                    <button
                      onClick={() => updateStatus(r, 'open')}
                      disabled={busyId === r.id}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] transition hover:text-[var(--fg)] disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}
