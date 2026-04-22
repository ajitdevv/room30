'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '@/lib/api';
import Pagination from '../_components/Pagination';
import { Header } from '../users/page';
import { ConfirmModal } from '../listings/page';

export default function ReviewsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet(`/api/admin/reviews?page=${page}&pageSize=${pageSize}`, { auth: true })
      .then((r) => {
        if (!alive) return;
        setItems(r.reviews || []);
        setTotal(r.total || 0);
        setNotice(r.notice || '');
        setErr('');
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page]);

  async function doDelete(r) {
    setBusyId(r.id);
    setErr('');
    try {
      await apiDelete(`/api/admin/reviews/${r.id}`, { auth: true });
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmDel(null);
    } catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <Header title="Reviews" subtitle="Renter ratings of owners. Remove abusive or fake reviews." count={total} />

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      {notice && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <div>
            <div className="font-semibold">Reviews not set up yet</div>
            <div className="mt-0.5 text-xs leading-relaxed opacity-90">
              {notice} Run the SQL in Supabase, then refresh.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No reviews yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm">
                    <span className="font-semibold">{r.reviewer?.name?.trim() || r.reviewer?.email || 'Renter'}</span>
                    <span className="text-[var(--muted)]"> reviewed </span>
                    <span className="font-semibold">{r.owner?.name?.trim() || r.owner?.email || 'Owner'}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-[var(--muted)]">{r.comment}</p>}
                </div>
                <button
                  onClick={() => setConfirmDel(r)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {confirmDel && (
        <ConfirmModal
          title="Delete this review?"
          desc="The reviewer will need to submit a new review if they want to rate this owner again."
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => doDelete(confirmDel)}
          busy={busyId === confirmDel.id}
        />
      )}
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${n <= value ? 'text-amber-500' : 'text-[var(--border-strong)]'}`} fill={n <= value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}
