'use client';
import Link from 'next/link';
import { useAuthUser } from '@/lib/useAuthUser';

export default function Footer() {
  const { role } = useAuthUser();
  return role === 'owner' ? <OwnerFooter /> : <RenterFooter />;
}

function RenterFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <BrandCol tagline="The honest way to find a monthly room in Jaipur. No brokers. No fake listings." />

          <FooterCol title="Find" links={[
            ['Browse rooms', '/listings'],
            ['Popular localities', '/listings'],
            ['Saved rooms', '/dashboard'],
            ['My chats', '/chat'],
          ]} />
          <FooterCol title="Plans" links={[
            ['Pricing', '/plans'],
            ['How unlocking works', '/plans'],
            ['Refund policy', '/refund-policy'],
          ]} />
          <FooterCol title="Help" links={[
            ['About us', '/about'],
            ['Safety tips', '#'],
            ['Report a listing', '#'],
            ['Contact support', '#'],
          ]} />
        </div>
        <BottomBar year={year} badge="Looking for something honest" />
      </div>
    </footer>
  );
}

function OwnerFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-bold tracking-tight">
              Room<span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">30</span>{' '}
              <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">OWNER</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              Rent directly to verified renters. Zero listing fees. Fast response, real tenants.
            </p>
            <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Post a new listing
            </Link>
          </div>

          <FooterCol title="Manage" links={[
            ['My listings', '/dashboard'],
            ['Renter inbox', '/chat'],
            ['Recently deleted', '/dashboard'],
            ['Listing analytics', '#'],
          ]} />
          <FooterCol title="Grow" links={[
            ['Better photo tips', '#'],
            ['Pricing guide', '#'],
            ['Verification badge', '#'],
            ['Owner academy', '#'],
          ]} />
          <FooterCol title="Support" links={[
            ['About Room30', '/about'],
            ['Owner helpdesk', '#'],
            ['Payments & payouts', '#'],
            ['Terms for owners', '#'],
          ]} />
        </div>
        <BottomBar year={year} badge="Zero brokerage, real tenants" tone="emerald" />
      </div>
    </footer>
  );
}

function BrandCol({ tagline }) {
  return (
    <div>
      <div className="text-lg font-bold tracking-tight">
        Room<span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">30</span>
      </div>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted)]">{tagline}</p>
      <div className="mt-4 flex items-center gap-2">
        <Social label="X" href="#">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2H21l-6.56 7.495L22 22h-6.828l-4.77-6.238L4.8 22H2l7.03-8.04L2 2h7l4.29 5.69L18.244 2zm-2.39 18h1.686L7.23 3.93H5.42l10.434 16.07z"/></svg>
        </Social>
        <Social label="Instagram" href="#">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <rect x="3" y="3" width="18" height="18" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </Social>
        <Social label="LinkedIn" href="#">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M4.98 3.5a2.5 2.5 0 11-.01 5.001A2.5 2.5 0 014.98 3.5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-.9 1.83-1.9 3.77-1.9 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.3c0-1.27-.02-2.9-1.77-2.9-1.77 0-2.05 1.38-2.05 2.81V21h-4V9z"/></svg>
        </Social>
        <Social label="WhatsApp" href="#">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.148-.669.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.074-.149-.669-1.611-.916-2.207-.241-.58-.487-.5-.669-.51-.172-.008-.371-.01-.57-.01-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.335.101 11.893c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.93 11.93 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.893a11.82 11.82 0 00-3.48-8.413Z"/></svg>
        </Social>
      </div>
    </div>
  );
}

function Social({ label, href, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-indigo-400 hover:text-indigo-500 hover:shadow-md hover:shadow-indigo-500/10 active:scale-95"
    >
      {children}
      <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 opacity-0 transition group-hover:opacity-100" />
    </a>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([t, h]) => (
          <li key={t + h}>
            <Link href={h} className="text-[var(--fg)]/80 transition hover:text-indigo-500">{t}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BottomBar({ year, badge, tone = 'emerald' }) {
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-emerald-500';
  return (
    <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center">
      <span>© {year} Room30. Crafted in Jaipur.</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {badge}
      </span>
    </div>
  );
}
