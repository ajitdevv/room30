'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBox from './_components/SearchBox';
import { useAuthUser } from '@/lib/useAuthUser';

const LOCALITIES = [
  'Vaishali Nagar', 'Malviya Nagar', 'Mansarovar', 'C-Scheme', 'Raja Park', 'Jagatpura', 'Tonk Road', 'Sitapura',
];

const FEATURES = [
  { t: 'Verified listings', d: 'Every listing is validated. Reported listings are reviewed within 24 hours.', icon: 'M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z' },
  { t: 'First chat free', d: 'Start your first conversation with any owner at zero cost — no credit card.', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { t: 'No brokerage', d: 'Direct-to-owner. Pay rent + deposit, nothing else. Ever.', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { t: 'Instant contact', d: 'Unlock owner phone numbers with a plan and move faster than the market.', icon: 'M22 16.92V21a1 1 0 01-1.09 1 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 013.18 4.09 1 1 0 014.18 3h4.09a1 1 0 011 .75 12 12 0 00.66 2.65 1 1 0 01-.23 1L8.09 9.01a16 16 0 006 6l1.61-1.61a1 1 0 011-.23 12 12 0 002.65.66 1 1 0 01.75 1z' },
];

const TESTIMONIALS = [
  { q: 'Found a 2BHK in Vaishali in four days. Owner responded in an hour. Easiest rental move I\'ve ever done.', n: 'Priya Sharma', r: 'Product Designer' },
  { q: 'No broker, no drama. The listing numbers make it easy to share with roommates.', n: 'Aditya Mehta', r: 'Software Engineer' },
  { q: 'As an owner, I get real tenants, not time-wasters. The plan gate filters serious renters.', n: 'Ramesh Bansal', r: 'Property Owner' },
];

const FAQS = [
  ['Is Room30 free to use?', 'Searching and your first chat with any owner are completely free. Plans only unlock more contacts beyond that.'],
  ['How do I know a listing is real?', 'Every listing has a unique number. Owners are verified. Reports trigger a 24-hour review.'],
  ['How fast can I move in?', 'Most of our listings are move-in ready. Contact the owner and finalise on the same day.'],
  ['Do owners pay to list?', 'No. Listing is free for owners. We only charge renters for premium contact access.'],
];

const RENTER_COMPARISON = [
  { old: 'Knock on every gate, ring every "To-Let" board', room30: 'Browse verified listings from your couch' },
  { old: 'Pay the broker one full month\'s rent as commission', room30: 'Zero brokerage — ever. Keep that ₹15,000 in your pocket' },
  { old: 'Burn two weekends visiting fake or already-rented flats', room30: 'Every listing has a unique number and gets verified' },
  { old: 'Wait days for a broker to "find something" in your budget', room30: 'Filter by rent, furnishing, locality in two taps' },
  { old: 'Awkward phone calls through three middlemen', room30: 'Chat directly with the owner — first one is free' },
];

const OWNER_COMPARISON = [
  { old: 'Tape a "For Rent" paper outside and hope someone calls', room30: 'Listed online in 3 minutes with photos and a unique ID' },
  { old: 'Broker brings ten tyre-kickers who never sign', room30: 'Plan-gated chats filter out time-wasters automatically' },
  { old: 'Give up one month\'s rent to the broker on every new tenant', room30: 'Listing is free, forever. You keep 100% of the rent' },
  { old: 'Strangers walking in at odd hours for "just one look"', room30: 'Schedule visits via chat, only when you\'re ready' },
  { old: 'No idea why your listing isn\'t getting calls', room30: 'See view counts and message activity in your dashboard' },
];

export default function Home() {
  const { role, loading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role === 'owner') router.replace('/dashboard');
  }, [role, loading, router]);

  if (loading || role === 'owner') {
    return <div className="py-24 text-center text-sm text-[var(--muted)]">Loading…</div>;
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-aurora bg-noise">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-12 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:pt-28">
          <div className="mb-4 inline-flex animate-fade-up items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-[11px] font-medium text-[var(--muted)] backdrop-blur sm:mb-6 sm:text-xs">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Live in Jaipur · 1,200+ verified listings
          </div>
          <h1 className="max-w-4xl animate-fade-up text-3xl font-semibold tracking-tight text-[var(--fg)] sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Find your next room in{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 bg-clip-text text-transparent">Jaipur</span>
              <svg viewBox="0 0 200 10" className="absolute -bottom-2 left-0 w-full text-indigo-400/60" preserveAspectRatio="none"><path d="M0 5 Q 50 0 100 5 T 200 5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </span>
            <br/>monthly, no nonsense.
          </h1>
          <p className="mt-4 max-w-xl animate-fade-up text-[15px] leading-relaxed text-[var(--muted)] sm:mt-6 sm:text-lg">
            Rooms, PGs, and flats — directly from owners. Search by locality, chat instantly, move in{' '}
            <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              within one day
            </span>.
          </p>
          <div className="mt-6 w-full animate-fade-up flex justify-center sm:mt-10">
            <SearchBox />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] sm:mt-4 sm:gap-2 sm:text-xs">
            <span className="text-[var(--subtle)]">Popular:</span>
            {LOCALITIES.slice(0, 5).map((l) => (
              <Link key={l} href={`/listings?q=${encodeURIComponent(l)}`} className="rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-2.5 py-1 font-medium text-[var(--muted)] backdrop-blur transition hover:border-indigo-400 hover:text-indigo-500 sm:px-3">
                {l}
              </Link>
            ))}
          </div>

          {/* Trust stats */}
          <div className="mt-8 grid w-full max-w-3xl animate-fade-up grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur sm:mt-16 sm:p-6">
            <Stat k="1.2k+" v="Verified rooms" />
            <Stat k="2 days" v="Avg. move-in time" />
            <Stat k="100%" v="Owner-direct" />
          </div>
        </div>
      </section>

      {/* LOCALITIES */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
        <SectionHeader eyebrow="Explore" title="Popular localities in Jaipur" />
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-4 sm:gap-3">
          {LOCALITIES.map((l, i) => (
            <Link
              key={l}
              href={`/listings?q=${encodeURIComponent(l)}`}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-indigo-400/60 hover:shadow-lg hover:shadow-indigo-500/5 sm:p-5"
            >
              <div className="absolute right-3 top-3 text-[var(--subtle)] transition group-hover:text-indigo-500 group-hover:translate-x-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </div>
              <div className="text-[11px] font-semibold text-[var(--subtle)] sm:text-xs">0{i + 1}</div>
              <div className="mt-1 text-sm font-semibold tracking-tight sm:text-base">{l}</div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)] sm:text-xs">{20 + (i * 7) % 40}+ listings</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
          <SectionHeader eyebrow="Why Room30" title="Built for honest rentals" />
          <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.t} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 transition hover:border-indigo-400/60 hover:shadow-lg hover:shadow-indigo-500/5 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-indigo-600 dark:text-indigo-300 sm:h-11 sm:w-11">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={f.icon}/></svg>
                </div>
                <div className="mt-3 text-[15px] font-semibold tracking-tight sm:mt-4 sm:text-base">{f.t}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)] sm:mt-2">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RENTER COMPARISON — old way vs Room30 */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
        <SectionHeader eyebrow="The honest comparison" title="Room hunting used to be a full-time job." />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-[15px]">
          Skip the boards, the brokers, and the middle-men. Here&apos;s how renting in Jaipur changes the moment you open Room30.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] sm:mt-10 sm:rounded-3xl">
          <div className="grid divide-[var(--border)] sm:grid-cols-[1fr_1fr] sm:divide-x">
            <div className="bg-[var(--elevated)]/40 px-4 py-3 sm:px-8 sm:py-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:text-xs">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>
                The old way
              </div>
            </div>
            <div className="relative px-4 py-3 sm:px-8 sm:py-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500 sm:text-xs">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                With Room30
              </div>
              <span className="absolute right-6 top-1/2 hidden -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white sm:inline-block">Better</span>
            </div>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {RENTER_COMPARISON.map((row, i) => (
              <li key={i} className="grid sm:grid-cols-[1fr_1fr] sm:divide-x sm:divide-[var(--border)]">
                <div className="flex items-start gap-2.5 px-4 py-3 text-[13px] text-[var(--muted)] sm:gap-3 sm:px-8 sm:py-5 sm:text-sm">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 sm:h-5 sm:w-5">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </span>
                  <span className="line-through decoration-[var(--border-strong)]">{row.old}</span>
                </div>
                <div className="flex items-start gap-2.5 bg-gradient-to-br from-indigo-50/70 via-transparent to-fuchsia-50/70 px-4 py-3 text-[13px] font-medium text-[var(--fg)] dark:from-indigo-500/5 dark:to-fuchsia-500/5 sm:gap-3 sm:px-8 sm:py-5 sm:text-sm">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 sm:h-5 sm:w-5">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span>{row.room30}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--elevated)]/30 px-4 py-3 sm:px-8 sm:py-4">
            <div className="text-xs text-[var(--muted)] sm:text-sm">
              You save <span className="font-semibold text-[var(--fg)]">weekends</span>, <span className="font-semibold text-[var(--fg)]">brokerage</span>, and <span className="font-semibold text-[var(--fg)]">your sanity</span>.
            </div>
            <Link href="/listings" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg sm:px-4 sm:py-2 sm:text-xs">
              Start the easy way
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
        <SectionHeader eyebrow="How it works" title="Three steps. No brokers." />
        <div className="relative mt-6 grid gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-6">
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent sm:block" style={{ background: 'linear-gradient(to right, transparent, var(--border-strong), transparent)' }} />
          {[
            { n: '01', t: 'Search', d: 'Browse live listings by locality or listing number. Filter by rent, tenant type, furnishing.' },
            { n: '02', t: 'Chat',   d: 'Your first conversation with any owner is free. Ask questions, confirm visits.' },
            { n: '03', t: 'Move',   d: 'Unlock phone numbers with a plan and sign directly with the owner. No brokerage fee.' },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-base font-bold text-white shadow-lg shadow-indigo-500/20 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-lg">{s.n}</span>
                <div className="text-lg font-semibold tracking-tight sm:text-xl">{s.t}</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:mt-4">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
          <SectionHeader eyebrow="Loved by renters & owners" title="People find real homes here" />
          <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-5">
            {TESTIMONIALS.map((t) => (
              <figure key={t.n} className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-6">
                <blockquote className="text-[14px] leading-relaxed text-[var(--fg)] sm:text-[15px]">
                  <span className="font-serif text-2xl leading-none text-indigo-400 sm:text-3xl">“</span>{t.q}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 sm:mt-5 sm:pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-semibold text-white sm:h-10 sm:w-10">
                    {t.n.charAt(0)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{t.n}</div>
                    <div className="text-xs text-[var(--muted)]">{t.r}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-20">
        <SectionHeader eyebrow="FAQ" title="Questions, answered" center />
        <div className="mt-6 space-y-2 sm:mt-10">
          {FAQS.map(([q, a], i) => <FaqItem key={i} q={q} a={a} />)}
        </div>
      </section>

      {/* OWNER PITCH — for landlords who land here */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 10l9-7 9 7M5 10v10h14V10"/></svg>
                For property owners
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-4xl">
                List once. Rent it out.{' '}
                <span className="bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">Keep the whole rent.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-[15px]">
                The broker eats a full month&apos;s rent every time you rotate a tenant. Room30 doesn&apos;t. Post your flat in 3 minutes, chat only with renters who&apos;ve invested in a plan, and skip the time-wasters.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
                <MiniStat k="₹0" v="brokerage to us" />
                <MiniStat k="3 min" v="to publish a listing" />
                <MiniStat k="100%" v="verified renters" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
                <Link href="/login?role=owner" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:shadow-xl sm:px-5 sm:py-2.5 sm:text-sm">
                  List your property free
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </Link>
                <Link href="/listings" className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-semibold text-[var(--fg)] transition hover:border-emerald-400 sm:px-5 sm:py-2.5 sm:text-sm">
                  See live listings
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg)]">
              <div className="grid divide-[var(--border)] sm:grid-cols-[1fr_1fr] sm:divide-x">
                <div className="bg-[var(--elevated)]/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Broker / To-Let board</div>
                <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Room30</div>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {OWNER_COMPARISON.map((row, i) => (
                  <li key={i} className="grid sm:grid-cols-[1fr_1fr] sm:divide-x sm:divide-[var(--border)]">
                    <div className="flex items-start gap-2.5 px-5 py-4 text-[13px] text-[var(--muted)]">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </span>
                      <span>{row.old}</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-gradient-to-br from-emerald-50/70 via-transparent to-teal-50/70 px-5 py-4 text-[13px] font-medium text-[var(--fg)] dark:from-emerald-500/5 dark:to-teal-500/5">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      <span>{row.room30}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-8 text-center text-white shadow-2xl shadow-indigo-600/20 sm:rounded-3xl sm:px-14 sm:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: 'radial-gradient(600px 300px at 20% 0%, white, transparent 60%)' }} />
          <h3 className="relative text-2xl font-semibold tracking-tight sm:text-4xl">Your next room is a conversation away.</h3>
          <p className="relative mx-auto mt-2 max-w-xl text-sm text-white/80 sm:mt-3 sm:text-base">Start searching now — your first message is on us.</p>
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-7 sm:gap-3">
            <Link href="/listings" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:px-6 sm:py-3">
              Browse listings
            </Link>
            <Link href="/plans" className="rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-6 sm:py-3">
              View plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, center }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500 sm:text-xs">{eyebrow}</div>
      <h2 className="mt-1.5 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-4xl">{title}</h2>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className="px-3 text-center first:pl-0 last:pr-0">
      <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{k}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{v}</div>
    </div>
  );
}

function MiniStat({ k, v }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <div className="text-xl font-semibold tracking-tight">{k}</div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{v}</div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border transition ${open ? 'border-indigo-400/60 bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-[15px] font-semibold">{q}</span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition ${open ? 'rotate-45 border-indigo-400 text-indigo-500' : ''}`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">{a}</div>
        </div>
      </div>
    </div>
  );
}
