'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuthUser } from '@/lib/useAuthUser';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  const { user, role } = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const home = role === 'owner' ? '/dashboard' : '/';

  const links = !user
    ? [['Browse', '/listings'], ['Plans', '/plans'], ['About', '/about']]
    : role === 'admin'
      ? [['Admin', '/admin'], ['Browse', '/listings'], ['Chat', '/chat']]
      : role === 'owner'
        ? [['My listings', '/dashboard'], ['Inbox', '/chat']]
        : [['Browse', '/listings'], ['Saved', '/saved'], ['Chat', '/chat'], ['My plan', '/dashboard/plan']];

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] shadow-sm shadow-black/[0.03] backdrop-blur-xl'
          : 'border-transparent bg-[color-mix(in_oklab,var(--bg)_40%,transparent)] backdrop-blur'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <Link href={home} className="group flex items-center gap-1.5 text-lg font-bold tracking-tight sm:gap-2 sm:text-xl">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition group-hover:scale-[1.04] group-hover:shadow-indigo-500/40 sm:h-9 sm:w-9">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 10l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
          </span>
          <span>
            Room<span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">30</span>
          </span>
          {role === 'owner' && (
            <span className="ml-1 hidden rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 sm:inline-block">
              OWNER
            </span>
          )}
          {role === 'admin' && (
            <span className="ml-1 hidden rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white shadow-sm sm:inline-block">
              ADMIN
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([t, h]) => {
            const active = pathname === h || (h !== '/' && pathname?.startsWith(h));
            return (
              <Link
                key={h}
                href={h}
                className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-[var(--fg)] ring-1 ring-indigo-400/30'
                    : 'text-[var(--muted)] hover:bg-[var(--elevated)]/60 hover:text-[var(--fg)]'
                }`}
              >
                {t}
                {active && (
                  <span className="pointer-events-none absolute inset-x-4 -bottom-[1px] h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />

          {user && role === 'owner' && (
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add property
            </Link>
          )}

          {user ? (
            <button
              onClick={signOut}
              className="hidden md:inline-flex rounded-full bg-[var(--fg)] px-3.5 py-1.5 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-flex rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:brightness-110"
            >
              Login
            </Link>
          )}

          <button
            aria-label="Open menu"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--fg)] md:hidden"
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] transition-[max-height,opacity] duration-300 ${open ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
          {links.map(([t, h]) => {
            const active = pathname === h || (h !== '/' && pathname?.startsWith(h));
            return (
              <Link key={h} href={h} className={`rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-[var(--elevated)] font-semibold' : 'text-[var(--muted)]'}`}>
                {t}
              </Link>
            );
          })}
          <div className="mt-2 flex gap-2">
            {user ? (
              <button onClick={signOut} className="flex-1 rounded-xl bg-[var(--fg)] px-3 py-2 text-sm font-semibold text-[var(--bg)]">Sign out</button>
            ) : (
              <Link href="/login" className="flex-1 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3 py-2 text-center text-sm font-semibold text-white">Login</Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
