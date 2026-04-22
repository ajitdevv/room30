'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

export default function SearchBox({ initial = '' }) {
  const [q, setQ] = useState(initial);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!q) { setSuggestions([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { suggestions } = await apiGet(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        setSuggestions(suggestions);
        setOpen(true);
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(timer.current);
  }, [q]);

  function go(value) {
    setOpen(false);
    router.push(`/listings?q=${encodeURIComponent(value)}`);
  }

  function onKey(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); go(suggestions[active].label); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <div className="relative flex items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-slate-900/[0.04] ring-1 ring-black/[0.02] transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-[var(--ring)]">
          <div className="pl-5 pr-2 text-[var(--muted)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          </div>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(-1); }}
            onFocus={() => q && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
            placeholder="Search by locality or listing # (e.g. 00001)"
            className="flex-1 bg-transparent py-3.5 pr-2 text-[15px] text-[var(--fg)] outline-none placeholder:text-[var(--subtle)]"
          />
          <button
            type="submit"
            className="m-1.5 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95"
          >
            Search
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="relative mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-slate-900/10 sm:absolute sm:z-50">
          <div className="border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">Suggestions</div>
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={() => go(s.label)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${active === i ? 'bg-[var(--elevated)]' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--subtle)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="font-medium">{s.label}</span>
                </span>
                <span className="rounded-full bg-[var(--elevated)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{s.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
