'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthUser } from '@/lib/useAuthUser';

const NAV = [
  { href: '/admin',          label: 'Overview',   icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { href: '/admin/users',    label: 'Users',      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 010 7.75' },
  { href: '/admin/listings', label: 'Listings',   icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10' },
  { href: '/admin/reports',  label: 'Reports',    icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
  { href: '/admin/reviews',  label: 'Reviews',    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z' },
  { href: '/admin/plans',    label: 'Plans',      icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { href: '/admin/offers',   label: 'Offers',     icon: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01' },
  { href: '/admin/audit',    label: 'Audit log',  icon: 'M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14' },
];

export default function AdminShell({ children }) {
  const { profile, loading } = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && profile?.role !== 'admin') router.replace('/');
  }, [loading, profile, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading || !profile || profile.role !== 'admin') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-[var(--muted)]">
        Checking admin access…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-3 py-6 sm:px-6">
      {/* Sidebar — sticky on desktop, drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] transition-transform lg:sticky lg:top-24 lg:z-0 lg:h-[calc(100vh-6rem)] lg:translate-x-0 lg:rounded-2xl lg:border ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 lg:py-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Room30</div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Admin
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="px-2.5 pb-4">
          {NAV.map((item) => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-[var(--fg)] ring-1 ring-indigo-400/30'
                    : 'text-[var(--muted)] hover:bg-[var(--elevated)]/60 hover:text-[var(--fg)]'
                }`}
              >
                <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-indigo-500' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--muted)]">
          <div className="line-clamp-1">Signed in as</div>
          <div className="mt-0.5 line-clamp-1 font-semibold text-[var(--fg)]">{profile.name || profile.email}</div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">
        <button
          onClick={() => setMobileOpen(true)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          Admin menu
        </button>
        {children}
      </main>
    </div>
  );
}
