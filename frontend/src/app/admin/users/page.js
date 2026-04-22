'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Pagination from '../_components/Pagination';

export default function UsersAdminPage() {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded bg-[var(--elevated)]" />}>
      <UsersAdmin />
    </Suspense>
  );
}

function UsersAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [roleFilter, setRoleFilter] = useState(sp.get('role') || '');
  const [q, setQ] = useState('');
  const [debQ, setDebQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [debQ, roleFilter]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page, pageSize });
    if (roleFilter) params.set('role', roleFilter);
    if (debQ) params.set('q', debQ);
    apiGet(`/api/admin/users?${params.toString()}`, { auth: true })
      .then((r) => {
        if (!alive) return;
        setUsers(r.users || []);
        setTotal(r.total || 0);
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, roleFilter, debQ]);

  async function setRole(u, role) {
    if (u.role === role) return;
    setBusyId(u.id);
    setErr('');
    try {
      const r = await apiPatch(`/api/admin/users/${u.id}`, { role }, { auth: true });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: r.user.role } : x));
    } catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <Header
        title="Users"
        subtitle="Manage renters, owners, and fellow admins."
        count={total}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or name…"
          className="w-full flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none transition focus:border-indigo-400 sm:w-auto"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            const params = new URLSearchParams(sp.toString());
            if (e.target.value) params.set('role', e.target.value); else params.delete('role');
            router.replace(`/admin/users?${params.toString()}`);
          }}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium outline-none"
        >
          <option value="">All roles</option>
          <option value="renter">Renters</option>
          <option value="owner">Owners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="hidden grid-cols-[1.4fr_1fr_auto_auto] items-center gap-4 border-b border-[var(--border)] bg-[var(--elevated)]/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] sm:grid">
          <div>User</div>
          <div>Joined</div>
          <div>Role</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--elevated)]" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">No users match.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {users.map((u) => (
              <li key={u.id} className="grid grid-cols-1 gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-semibold text-white">
                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-semibold">{u.name?.trim() || u.email.split('@')[0]}</div>
                    <div className="line-clamp-1 text-[11px] text-[var(--muted)]">{u.email}</div>
                  </div>
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <RolePill role={u.role} />
                <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
                  {['renter', 'owner', 'admin'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(u, r)}
                      disabled={busyId === u.id || u.role === r}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        u.role === r
                          ? 'border-indigo-400 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                          : 'border-[var(--border)] text-[var(--muted)] hover:border-indigo-400 hover:text-[var(--fg)]'
                      } disabled:opacity-60`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}

export function Header({ title, subtitle, count }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {count !== undefined && (
        <span className="rounded-full bg-[var(--elevated)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          {count.toLocaleString('en-IN')} total
        </span>
      )}
    </header>
  );
}

function RolePill({ role }) {
  const map = {
    admin:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
    owner:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    renter: 'bg-[var(--elevated)] text-[var(--muted)]',
  };
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[role] || map.renter}`}>
      {role}
    </span>
  );
}
