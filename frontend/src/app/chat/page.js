'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { formatListingNumber } from '@/lib/format';
import Pagination from '../_components/Pagination';

const PAGE_SIZE = 15;

export default function ChatList() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { router.push('/login'); return; }
      apiGet('/api/chat/threads', { auth: true })
        .then((r) => setThreads(r.threads || []))
        .finally(() => setLoading(false));
    });
  }, [router]);

  // Reset to page 1 whenever search narrows the list.
  useEffect(() => { setPage(1); }, [query]);

  const filtered = useMemo(() => threads.filter((t) =>
    !query ||
    t.other_name?.toLowerCase().includes(query.toLowerCase()) ||
    t.property?.title?.toLowerCase().includes(query.toLowerCase()) ||
    t.message?.toLowerCase().includes(query.toLowerCase())
  ), [threads, query]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Conversations</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your chats</h1>
        </div>
        <div className="text-sm text-[var(--muted)]">{threads.length} thread{threads.length === 1 ? '' : 's'}</div>
      </header>

      {threads.length > 0 && (
        <div className="mt-6 relative">
          <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, listing, or message"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div className="mt-4 text-base font-semibold">
            {query ? 'No matches' : 'No conversations yet'}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {query ? 'Try a different search.' : 'Start one from a property page.'}
          </p>
          {!query && (
            <Link href="/listings" className="mt-5 inline-flex rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white">
              Browse listings
            </Link>
          )}
        </div>
      ) : (
        <>
        <ul className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {paged.map((t) => (
            <li key={t.id}>
              <Link
                href={`/chat/${t.other_user_id}${t.property?.id ? `?property=${t.property.id}` : ''}`}
                className="flex items-start gap-3 px-4 py-4 transition hover:bg-[var(--elevated)]"
              >
                <Avatar name={t.other_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-semibold">{t.other_name}</span>
                      {t.property && (
                        <span className="flex-shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white dark:bg-white/10">
                          {formatListingNumber(t.property.listing_number)}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-[var(--subtle)]">
                      {formatRelative(t.created_at)}
                    </div>
                  </div>
                  {t.property && (
                    <div className="mt-0.5 truncate text-xs text-indigo-500">{t.property.title}</div>
                  )}
                  <div className="mt-1 truncate text-sm text-[var(--muted)]">{t.message}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function Avatar({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const hue = (initial.charCodeAt(0) * 37) % 360;
  return (
    <span
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 50%))` }}
    >
      {initial}
    </span>
  );
}

function formatRelative(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}
