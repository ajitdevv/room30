import Link from 'next/link';

export const metadata = {
  title: 'Refund policy · Room30',
  description: 'When you qualify for a refund on Room30 plans, and when you don\'t. Read before you buy.',
};

export default function RefundPolicyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg)]">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pb-14 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--muted)] sm:text-xs">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Effective policy · updated today
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-5xl sm:leading-[1.1]">
            Refund policy
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-lg">
            Short version: your plan is fully refundable within 30 days{' '}
            <strong className="text-[var(--fg)]">as long as you haven&apos;t already used it to unlock an owner&apos;s contact</strong>.
            Once you&apos;ve seen even one owner&apos;s phone number, the plan is considered consumed.
          </p>

          <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
            <Chip tone="emerald" label="Eligible" lines={['Bought a plan', '0 contacts unlocked', 'Within 30 days']} />
            <Chip tone="rose" label="Not eligible" lines={['Bought a plan', '≥ 1 contact unlocked', 'Any time window']} />
          </div>
        </div>
      </section>

      {/* Key rule callout */}
      <section className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 sm:rounded-3xl sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300 sm:text-xs">Please read before buying</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">Using the plan = forfeiting the refund.</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg)]/90 sm:text-[15px]">
                The moment you click{' '}
                <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-[var(--border)]">Show contact number</span>{' '}
                on any listing and a phone number is revealed to you, the plan is treated as <strong>used</strong>. No matter which tier you bought (₹49 / ₹99 / ₹199), no matter how many contacts you have left, and no matter how many days are left in your 30-day window — we cannot issue a refund once a contact has been unlocked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility rules — detailed */}
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Card tone="emerald" title="You qualify for a full refund if…">
            <Rule ok>You bought a plan in the last 30 days.</Rule>
            <Rule ok>You have <strong>not</strong> unlocked any owner&apos;s phone number using the plan.</Rule>
            <Rule ok>You couldn&apos;t find a suitable room and want to cancel.</Rule>
            <Rule ok>Payment was successful but the subscription didn&apos;t activate.</Rule>
            <Rule ok>You were charged more than once for the same plan.</Rule>
          </Card>

          <Card tone="rose" title="You do NOT qualify for a refund if…">
            <Rule>You unlocked even one owner&apos;s phone number.</Rule>
            <Rule>You chatted with an owner after buying the plan (chats are a plan benefit once the free first chat is used up).</Rule>
            <Rule>The 30-day window from your purchase date has passed.</Rule>
            <Rule>You&apos;re requesting a refund because the owner didn&apos;t respond — owners manage their own inboxes.</Rule>
            <Rule>You want a refund because the listing was already rented — listings update in real time; always chat to confirm before paying.</Rule>
            <Rule>The plan has fully expired (duration ended).</Rule>
          </Card>
        </div>
      </section>

      {/* What counts as "using" the plan */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">The fine line</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">What counts as &ldquo;using&rdquo; your plan</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            We want this to be unambiguous. Here&apos;s exactly what flips your account from <em>refundable</em> to <em>used</em>:
          </p>

          <ul className="mt-6 space-y-2.5">
            <Item icon="✓" tone="emerald" head="Browsing listings">Always free. Does NOT count as using the plan.</Item>
            <Item icon="✓" tone="emerald" head="Saving listings to wishlist">Always free. Does NOT count.</Item>
            <Item icon="✓" tone="emerald" head="Sending your first free chat">This chat was free before you bought the plan. Does NOT count.</Item>
            <Item icon="✕" tone="rose"    head="Clicking “Show contact number”" bold>
              The API reveals the owner&apos;s phone to you. This is the plan&apos;s core benefit. <strong>Counts as used — no refund after this.</strong>
            </Item>
            <Item icon="✕" tone="rose"    head="Sending a 2nd+ chat using plan credit" bold>
              Once your free first chat is consumed, any further chat is drawn from the plan&apos;s contact quota and internally marks that owner as &ldquo;engaged&rdquo;. <strong>Counts as used.</strong>
            </Item>
          </ul>
        </div>
      </section>

      {/* How to request */}
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">How to request a refund</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">
          Email us and include the details below. We review every request within 2 working days.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Step n="01" t="Email us" d="support@room30.in with subject “Refund request”" />
          <Step n="02" t="Share your details" d="Payment ID, registered email, plan name, date of purchase" />
          <Step n="03" t="We verify + refund" d="If eligible, money returns to source in 5–7 working days" />
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--muted)]">
          <div className="font-semibold text-[var(--fg)]">What &ldquo;eligible&rdquo; means in practice</div>
          <p className="mt-1.5">
            Before replying, we check your account&apos;s <code className="rounded bg-[var(--elevated)] px-1 text-xs">unlocked_contacts</code> history.
            If we find zero owner phones revealed against this plan, you get a full refund. If we find one or more, we reply with the exact timestamp of the first unlock and the refund is declined per this policy.
          </p>
        </div>
      </section>

      {/* Processing + money flow */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Processing, timelines & amount</h2>
          <div className="mt-5 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
            <Row label="Refund amount" value="100% of the plan price paid." />
            <Row label="Processing time" value="Initiated within 2 working days of approval." />
            <Row label="Credit to bank" value="5–7 working days from initiation (depends on your bank)." />
            <Row label="Refund channel" value="Original payment method only (Razorpay routes it back to your card/UPI/netbanking)." />
            <Row label="GST / fees" value="If GST was charged, the tax component is also refunded. Razorpay processing fee may be deducted per their terms." />
            <Row label="Currency" value="INR only. No conversion adjustments." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">FAQ</h2>
        <div className="mt-5 space-y-2">
          <Faq q="I bought the ₹199 Pro plan and unlocked one owner — can I get a partial refund?"
               a="No. Our refund policy is all-or-nothing. Unlocking even a single contact means the plan has delivered its primary benefit to you, and no refund (partial or full) will be issued." />
          <Faq q="The owner I unlocked didn't reply. Can I get a refund?"
               a="No. Owner responsiveness is outside our control. Your plan unlocked the contact as promised; what happens in the chat between you and the owner is between you two. If the contact turns out to be fake or the listing is fraudulent, report the listing — we investigate within 24 hours, and genuine cases do qualify for a refund." />
          <Faq q="What if the plan never activated after payment?"
               a="Full refund. Email us with the Razorpay Payment ID and we fix it right away — either by activating the plan (preferred) or refunding the amount if you prefer." />
          <Faq q="Can I transfer my plan to a friend instead of refunding?"
               a="Not currently. Plans are tied to the account that paid for them." />
          <Faq q="What if I find the listing was fake after unlocking?"
               a="Use the Report button on the listing. If our review confirms the listing was fake, we refund the unlock as a credit (not cash) so you can try again — plus the listing gets removed." />
          <Faq q="Does the 30-day window start from purchase or first use?"
               a="Purchase date. If you never use the plan, you have 30 days to ask for a refund. Day 31 onwards we can't process it." />
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 sm:pb-20">
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-indigo-50 via-[var(--surface)] to-fuchsia-50 p-6 dark:from-indigo-500/10 dark:via-[var(--surface)] dark:to-fuchsia-500/10 sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Still have questions?</div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">We&apos;re real humans, 7 days a week.</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Email <a href="mailto:support@room30.in" className="font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">support@room30.in</a> and we&apos;ll reply within 2 hours on average.
            By using Room30 and purchasing a plan, you agree to this refund policy.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/plans" className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-xl">
              See plans
            </Link>
            <Link href="/about" className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold transition hover:border-indigo-400">
              About Room30
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ tone, label, lines }) {
  const map = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
    rose:    'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
  };
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${map[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <ul className="mt-1.5 space-y-0.5 text-sm font-medium">
        {lines.map((l, i) => <li key={i}>· {l}</li>)}
      </ul>
    </div>
  );
}

function Card({ tone, title, children }) {
  const head = tone === 'emerald'
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-rose-700 dark:text-rose-300';
  const border = tone === 'emerald'
    ? 'border-emerald-200/60 dark:border-emerald-500/20'
    : 'border-rose-200/60 dark:border-rose-500/20';
  return (
    <div className={`rounded-2xl border ${border} bg-[var(--surface)] p-5`}>
      <div className={`text-sm font-semibold ${head}`}>{title}</div>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function Rule({ ok = false, children }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {ok ? <polyline points="20 6 9 17 4 12" /> : <path d="M18 6L6 18M6 6l12 12" />}
        </svg>
      </span>
      <span className="text-[var(--fg)]/90">{children}</span>
    </li>
  );
}

function Item({ icon, tone, head, bold = false, children }) {
  const pill = tone === 'emerald'
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
  return (
    <li className={`flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 ${bold ? 'bg-[var(--bg)]' : 'bg-[var(--surface)]'}`}>
      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${pill}`}>{icon}</span>
      <div>
        <div className="text-sm font-semibold">{head}</div>
        <div className="mt-0.5 text-sm text-[var(--muted)]">{children}</div>
      </div>
    </li>
  );
}

function Step({ n, t, d }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-xs font-semibold text-indigo-500">{n}</div>
      <div className="mt-1 text-base font-semibold tracking-tight">{t}</div>
      <p className="mt-1 text-sm text-[var(--muted)]">{d}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-[var(--fg)]">{value}</span>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] open:border-indigo-400/60">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-semibold">
        {q}
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition group-open:rotate-45 group-open:border-indigo-400 group-open:text-indigo-500">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </span>
      </summary>
      <div className="px-5 pb-4 text-sm leading-relaxed text-[var(--muted)]">{a}</div>
    </details>
  );
}
