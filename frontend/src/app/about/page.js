import Link from 'next/link';

export const metadata = {
  title: 'About us · Room30',
  description: 'The story behind Room30 — a broker-free rental marketplace for Jaipur.',
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora bg-noise">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pb-16 sm:pt-20 lg:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-[11px] font-medium text-[var(--muted)] backdrop-blur sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            About Room30
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Rental hunting in Jaipur should take{' '}
            <span className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 bg-clip-text text-transparent">a day, not a month.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:mt-6 sm:text-lg">
            Room30 is a broker-free rental marketplace for Jaipur. We connect renters with verified owners directly — no middlemen, no commissions, no fake listings. Built by people who got tired of paying a month&apos;s rent just to find a place to live.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Our mission</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Cut the broker. Keep the trust.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
              The traditional rental system rewards middlemen, not the people actually living in the house. Brokers charge one month&apos;s rent to show you listings that are often outdated, rented, or fake. Owners don&apos;t know who to trust. Renters waste weekends and savings.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
              We&apos;re building the opposite: a place where every listing has a unique verified number, every owner is a real person, and every renter can browse, filter, chat, and finalise within a day — from their phone.
            </p>
          </div>

          <div className="grid gap-3">
            <Belief
              icon="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z"
              title="Verified first"
              desc="Every listing gets a unique number. Owners are verified. Reports trigger a 24-hour review."
            />
            <Belief
              icon="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
              title="Zero brokerage"
              desc="Listing is free for owners. Renters pay only for premium contact access — never a month's rent."
            />
            <Belief
              icon="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              title="Direct conversation"
              desc="First chat with any owner is free. No middleman in the loop, ever."
            />
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            <Stat k="1.2k+" v="Verified rooms" />
            <Stat k="2 days" v="Avg. move-in" />
            <Stat k="100%" v="Owner-direct" />
            <Stat k="30 days" v="Money-back window" />
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Our story</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">It started with a bad weekend.</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--muted)] sm:mt-6 sm:space-y-5">
          <p>
            One of our founders was moving to Jaipur for a new job. He spent two weekends with four different brokers, saw twelve flats that didn&apos;t match what was promised, and was quoted a ₹22,000 commission on a ₹22,000 room. On the third weekend he rented a place he found on WhatsApp through a friend — directly from the owner, no broker, in 40 minutes.
          </p>
          <p>
            That was the moment. If one WhatsApp message could bypass a whole industry, what was stopping us from building a proper product that did it at scale? Room30 is that product. We believe renting should work like ordering food — search, pick, confirm, done.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">What we stand for</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Four promises we keep</h2>
          </div>
          <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <Value n="01" t="Honest listings" d="If a listing is reported fake, we review within 24 hours and remove it if confirmed." />
            <Value n="02" t="Human support" d="Real humans, 7 days a week. Average response under 2 hours." />
            <Value n="03" t="Your money back" d="Haven't unlocked any contact yet? Full refund within 30 days — see the policy." />
            <Value n="04" t="Privacy by default" d="We never sell your number. Phone access is plan-gated, not broadcast." />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-5 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-indigo-50 via-[var(--surface)] to-fuchsia-50 p-5 dark:from-indigo-500/10 dark:via-[var(--surface)] dark:to-fuchsia-500/10 sm:grid-cols-3 sm:gap-6 sm:rounded-3xl sm:p-8">
          <ContactBlock
            title="Support"
            lines={['support@room30.in', 'Mon–Sun · 9am–9pm IST']}
            icon="M22 16.92V21a1 1 0 01-1.09 1 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 013.18 4.09 1 1 0 014.18 3h4.09a1 1 0 011 .75 12 12 0 00.66 2.65 1 1 0 01-.23 1L8.09 9.01a16 16 0 006 6l1.61-1.61a1 1 0 011-.23 12 12 0 002.65.66 1 1 0 01.75 1z"
          />
          <ContactBlock
            title="Owners"
            lines={['owners@room30.in', 'List your property free']}
            icon="M3 10l9-7 9 7M5 10v10h14V10"
          />
          <ContactBlock
            title="Partners & press"
            lines={['hello@room30.in', 'Based in Jaipur, India']}
            icon="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-10 sm:gap-3">
          <Link href="/listings" className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-xl sm:px-5 sm:py-2.5 sm:text-sm">
            Browse listings
          </Link>
          <Link href="/plans" className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold transition hover:border-indigo-400 sm:px-5 sm:py-2.5 sm:text-sm">
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}

function Belief({ icon, title, desc }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-indigo-600 dark:text-indigo-300">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
      </div>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-semibold tracking-tight sm:text-4xl">{k}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{v}</div>
    </div>
  );
}

function Value({ n, t, d }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
      <div className="text-xs font-semibold text-indigo-500">{n}</div>
      <div className="mt-1 text-base font-semibold tracking-tight">{t}</div>
      <p className="mt-2 text-sm text-[var(--muted)]">{d}</p>
    </div>
  );
}

function ContactBlock({ title, lines, icon }) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-[var(--surface)] dark:text-indigo-300">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'mt-1 text-[15px] font-semibold' : 'mt-0.5 text-xs text-[var(--muted)]'}>{l}</div>
      ))}
    </div>
  );
}
