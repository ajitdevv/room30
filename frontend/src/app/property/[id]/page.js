'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabaseClient';
import { formatListingNumber } from '@/lib/format';
import ReportModal from '@/app/_components/ReportModal';
import SubscriptionModal from '@/app/_components/SubscriptionModal';
import SaveButton from '@/app/_components/SaveButton';
import LazyImg from '@/app/_components/LazyImg';
import RelatedListings from '@/app/_components/RelatedListings';

export default function PropertyDetail({ params }) {
  const { id } = use(params);
  const [prop, setProp] = useState(null);
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('Hi, is this place still available?');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [subModal, setSubModal] = useState(null); // 'unlock' | 'chat' | null
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      try {
        const r = await apiGet(`/api/properties/${id}`, { auth: !!u });
        setProp(r.property);
      } catch (e) { setErr(friendlyError(e, { context: 'property' })); }
    })();

    // Fire-and-forget view counter. Debounce to once per day per listing
    // per browser so refreshes don't inflate trending.
    try {
      const key = `r30_viewed_${id}`;
      const last = Number(localStorage.getItem(key) || 0);
      const now = Date.now();
      if (now - last > 24 * 60 * 60 * 1000) {
        localStorage.setItem(key, String(now));
        apiPost(`/api/properties/${id}/view`, {}, { auth: false }).catch(() => {});
      }
    } catch {
      // localStorage disabled (private mode, etc.) — still count the view.
      apiPost(`/api/properties/${id}/view`, {}, { auth: false }).catch(() => {});
    }
  }, [id]);

  async function unlockPhone() {
    setUnlockErr('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.push(`/login?next=/property/${id}`);
      return;
    }
    setUnlocking(true);
    try {
      const r = await apiPost(`/api/properties/${id}/unlock`, {});
      setProp((p) => ({ ...p, owner_phone: r.owner_phone }));
    } catch (e) {
      if (e.status === 402) setSubModal('unlock');
      else setUnlockErr(friendlyError(e));
    } finally {
      setUnlocking(false);
    }
  }

  async function sendChat() {
    setErr('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.push(`/login?next=/property/${id}`);
      return;
    }
    if (sess.session.user.id === prop.owner_id) {
      setErr("You can't chat with your own listing.");
      return;
    }
    setBusy(true);
    try {
      await apiPost('/api/chat', {
        receiver_id: prop.owner_id,
        property_id: prop.id,
        message: msg,
      });
      router.push(`/chat/${prop.owner_id}?property=${prop.id}`);
    } catch (e) {
      if (e.status === 402) setSubModal('chat');
      else setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  if (err && !prop) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-red-100 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-300">{err}</div>
      </div>
    );
  }
  if (!prop) return <SkeletonPage />;

  const imgs = (prop.property_images || []).sort((a, b) => a.sort_order - b.sort_order);
  const ownerName = prop.profiles?.name?.trim() || 'Owner';
  const initial = ownerName.charAt(0).toUpperCase();

  return (
    <div className="bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">

        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link href="/" className="transition-colors hover:text-slate-900 dark:text-slate-100">Home</Link>
          <IconChevron className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <Link href="/listings" className="transition-colors hover:text-slate-900 dark:text-slate-100">{prop.city}</Link>
          <IconChevron className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <span className="truncate text-slate-800 dark:text-slate-200">{prop.title}</span>
        </nav>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {formatListingNumber(prop.listing_number)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <IconVerified className="h-3 w-3" /> Verified
              </span>
              {prop.room_type && (
                <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  {prop.room_type}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-[38px] sm:leading-[1.1]">
              {prop.title}
            </h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 sm:mt-2 sm:text-[15px]">
              <IconPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 sm:h-4 sm:w-4" />
              <span className="font-medium text-slate-700 dark:text-slate-300">{prop.locality}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>{prop.city}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton onClick={copyLink} label={copied ? 'Copied' : 'Share'}>
              {copied ? <IconCheck className="h-4 w-4" /> : <IconShare className="h-4 w-4" />}
            </IconButton>
            <SaveButton propertyId={prop.id} variant="inline" stopEvent={false} />
            <IconButton onClick={() => setShowReport(true)} label="Report" tone="danger">
              <IconFlag className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {showReport && (
          <ReportModal
            propertyId={prop.id}
            listingNumber={prop.listing_number}
            onClose={() => setShowReport(false)}
            onRequireLogin={() => router.push(`/login?next=/property/${id}`)}
          />
        )}

        <SubscriptionModal
          open={subModal !== null}
          onClose={() => setSubModal(null)}
          reason={subModal === 'unlock' ? 'Unlock this contact' : 'Keep chatting'}
          title={subModal === 'unlock' ? 'One plan. Every owner.' : 'First chat already used'}
          onSuccess={() => {
            setSubModal(null);
            if (subModal === 'unlock') unlockPhone();
            else if (subModal === 'chat') sendChat();
          }}
        />

        <Gallery imgs={imgs} />

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[1fr_400px] lg:gap-12">
          <div>
            <section className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700/80 sm:gap-4 sm:pb-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
                  Hosted by <span className="underline decoration-slate-300 decoration-2 underline-offset-4">{ownerName}</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">
                  {[prop.tenant_type && `${cap(prop.tenant_type)} tenants`, prop.furnishing && `${cap(prop.furnishing)} furnishing`]
                    .filter(Boolean).join(' · ') || 'Room available for monthly rent'}
                </p>
              </div>
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-fuchsia-600 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 sm:h-14 sm:w-14 sm:text-xl">
                {initial}
              </div>
            </section>

            <section className="space-y-3 border-b border-slate-200 py-4 dark:border-slate-700/80 sm:space-y-5 sm:py-6">
              <Feature
                icon={<IconShield className="h-5 w-5" />}
                title="Secure contact unlock"
                desc="Owner phone number is revealed only to subscribers — no spam, no scraped numbers."
              />
              <Feature
                icon={<IconSparkle className="h-5 w-5" />}
                title="First message is free"
                desc="Start a conversation at no cost. Upgrade only when you want to unlock more contacts."
              />
              <Feature
                icon={<IconKey className="h-5 w-5" />}
                title="Move-in ready"
                desc={prop.available_from
                  ? `Available from ${new Date(prop.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                  : 'Ready for immediate occupancy on a verified monthly lease.'}
              />
            </section>

            <section className="border-b border-slate-200 py-4 dark:border-slate-700/80 sm:py-6">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">About this place</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:mt-3 sm:text-[15px]">
                {prop.description || 'No description provided.'}
              </p>
            </section>

            {prop.amenities?.length > 0 && (
              <section className="border-b border-slate-200 py-4 dark:border-slate-700/80 sm:py-6">
                <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">What this place offers</h3>
                <ul className="mt-3 grid gap-x-4 gap-y-2 sm:mt-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
                  {prop.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 sm:gap-3 sm:text-[15px]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 sm:h-8 sm:w-8">
                        <IconCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ReviewsSection
              ownerId={prop.owner_id}
              ownerName={ownerName}
              propertyId={prop.id}
              currentUser={user}
              onLoginRequired={() => router.push(`/login?next=/property/${id}`)}
            />

            <section className="py-4 sm:py-6">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">At a glance</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4 sm:gap-3">
                <StatCard icon={<IconRupee />} label="Rent" value={`₹${prop.rent.toLocaleString('en-IN')}`} suffix="/ month" />
                <StatCard icon={<IconLock />} label="Deposit" value={`₹${prop.deposit.toLocaleString('en-IN')}`} />
                <StatCard icon={<IconUsers />} label="Tenant" value={cap(prop.tenant_type) || '—'} />
                <StatCard icon={<IconSofa />} label="Furnishing" value={cap(prop.furnishing) || '—'} />
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-black/[0.02] dark:border-indigo-500/20 dark:bg-slate-950 dark:shadow-2xl dark:shadow-indigo-500/10 dark:ring-white/[0.04]">
              {/* Price header — dark-first premium gradient with indigo glow */}
              <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white px-6 pt-6 pb-5 dark:border-white/5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl dark:opacity-100"
                  style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.35), transparent)' }}
                />
                <div
                  className="pointer-events-none absolute -left-16 -bottom-20 h-40 w-40 rounded-full opacity-0 blur-3xl dark:opacity-100"
                  style={{ background: 'radial-gradient(closest-side, rgba(217,70,239,0.25), transparent)' }}
                />

                <div className="relative flex items-center gap-1.5">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    Monthly rent
                  </span>
                </div>

                <div className="relative mt-2 flex items-baseline gap-1.5">
                  <span className="bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-[34px] font-semibold tracking-tight text-transparent dark:from-white dark:to-indigo-100">
                    ₹{prop.rent.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ month</span>
                </div>

                <div className="relative mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300 dark:ring-1 dark:ring-white/5">
                  <IconLock className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                  ₹{prop.deposit.toLocaleString('en-IN')} refundable deposit
                </div>
              </div>

              <div className="px-6 py-5">
                {prop.owner_phone ? (
                  <div className="relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-teal-500/10">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <IconUnlock className="h-3.5 w-3.5" />
                      Contact unlocked
                    </div>
                    <a
                      href={`tel:${prop.owner_phone}`}
                      className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-emerald-900 hover:underline dark:text-emerald-100"
                    >
                      <IconPhone className="h-4 w-4" />
                      {prop.owner_phone}
                    </a>
                    <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300/80">Tap to call directly.</p>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={unlockPhone}
                      disabled={unlocking}
                      className="group relative w-full overflow-hidden rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 ring-1 ring-slate-900/5 transition-all hover:bg-slate-800 hover:shadow-slate-900/30 active:scale-[0.99] disabled:opacity-60 dark:bg-gradient-to-br dark:from-indigo-600 dark:via-violet-600 dark:to-fuchsia-600 dark:shadow-indigo-600/30 dark:ring-white/10 dark:hover:shadow-indigo-600/40"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative flex items-center justify-center gap-2">
                        {unlocking ? (
                          <><Spinner /> Checking plan…</>
                        ) : (
                          <>
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/20">
                              <IconLock className="h-3 w-3" />
                            </span>
                            Show contact number
                          </>
                        )}
                      </span>
                    </button>
                    <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <IconInfo className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      Requires an active plan.{' '}
                      <button onClick={() => router.push('/plans')} className="font-semibold text-slate-900 underline underline-offset-2 transition hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200">
                        View plans
                      </button>
                    </p>
                    {unlockErr && (
                      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{unlockErr}</div>
                    )}
                  </div>
                )}

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-white/5" /></div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">Or</span>
                  </div>
                </div>

                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Message the owner</label>
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400/60 dark:focus:bg-white/[0.05] dark:focus:ring-indigo-500/20"
                  placeholder="Hi, is this place still available?"
                />
                {err && (
                  <div className="mt-2 rounded-lg border border-red-100 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{err}</div>
                )}
                <button
                  onClick={sendChat}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-60"
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-2"><Spinner /> Sending…</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">Send message <IconArrowRight className="h-4 w-4" /></span>
                  )}
                </button>
                <p className="mt-2.5 text-center text-[11px] text-slate-500 dark:text-slate-400">Your first message is always free.</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <IconShield className="h-3 w-3" />
              Secured by Room30. We never share your number.
            </div>
          </aside>
        </div>

        <RelatedListings propertyId={id} />
      </div>
    </div>
  );
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function Gallery({ imgs }) {
  if (imgs.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500 sm:mt-6 sm:h-80 sm:rounded-3xl">
        No images available
      </div>
    );
  }
  const hero = imgs[0];
  const rest = imgs.slice(1, 5);
  return (
    <div className="mt-4 grid h-[240px] grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl sm:mt-6 sm:h-[460px] sm:gap-2 sm:rounded-3xl">
      <div className="relative col-span-4 row-span-2 overflow-hidden sm:col-span-2">
        <LazyImg src={hero.image_url} alt="" className="h-full w-full" eager />
        {imgs.length > 1 && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white sm:hidden">
            {imgs.length} photos
          </span>
        )}
      </div>
      {rest.map((im, i) => (
        <div key={i} className="relative hidden overflow-hidden sm:block">
          <LazyImg src={im.image_url} alt="" className="h-full w-full" />
          {i === 3 && imgs.length > 5 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
              +{imgs.length - 5} more
            </div>
          )}
        </div>
      ))}
      {Array.from({ length: Math.max(0, 4 - rest.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="hidden bg-slate-100 dark:bg-slate-800 sm:block" />
      ))}
    </div>
  );
}

function IconButton({ children, label, onClick, tone = 'default', active = false }) {
  const base = 'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95';
  const styles = {
    default: active
      ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:border-slate-600',
    danger: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-red-200 dark:hover:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300',
  };
  return (
    <button onClick={onClick} className={`${base} ${styles[tone]}`}>
      {children}
      {label}
    </button>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, suffix }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900 px-4 py-3.5 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-5 h-10 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-6 h-[460px] animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-[360px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ReviewsSection({ ownerId, ownerName, propertyId, currentUser, onLoginRequired }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avg_rating: 0, review_count: 0 });
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [editing, setEditing] = useState(false);

  const isOwner = currentUser?.id === ownerId;
  const canReview = !!currentUser && !isOwner;
  const currentUserId = currentUser?.id;

  const [prevOwnerId, setPrevOwnerId] = useState(ownerId);
  if (prevOwnerId !== ownerId) {
    setPrevOwnerId(ownerId);
    setLoading(true);
    setReviews([]);
    setMine(null);
    setDraftRating(0);
    setDraftComment('');
  }

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    apiGet(`/api/reviews?owner_id=${ownerId}`)
      .then((r) => {
        if (cancelled) return;
        setReviews(r.reviews || []);
        setSummary(r.summary || { avg_rating: 0, review_count: 0 });
        if (currentUserId) {
          const own = (r.reviews || []).find((x) => x.reviewer_id === currentUserId);
          if (own) {
            setMine(own);
            setDraftRating(own.rating);
            setDraftComment(own.comment || '');
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ownerId, currentUserId]);

  async function submit() {
    setFormErr('');
    if (!canReview) { onLoginRequired?.(); return; }
    if (!draftRating) { setFormErr('Pick a star rating first.'); return; }
    setSubmitting(true);
    try {
      const { review } = await apiPost('/api/reviews', {
        owner_id: ownerId,
        property_id: propertyId,
        rating: draftRating,
        comment: draftComment.trim() || null,
      });
      // Re-fetch to get reviewer name + fresh summary.
      const r = await apiGet(`/api/reviews?owner_id=${ownerId}`);
      setReviews(r.reviews || []);
      setSummary(r.summary || { avg_rating: 0, review_count: 0 });
      setMine(review);
      setEditing(false);
    } catch (e) {
      setFormErr(friendlyError(e, { fallback: 'Could not save review.' }));
    } finally {
      setSubmitting(false);
    }
  }

  const visible = showAll ? reviews : reviews.slice(0, 3);
  const avg = Number(summary.avg_rating || 0);
  const count = Number(summary.review_count || 0);

  return (
    <section className="border-b border-slate-200 dark:border-slate-700/80 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Renters rate {ownerName}
        </h3>
        {count > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <StarRow value={avg} size="sm" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">{avg.toFixed(1)}</span>
            <span>· {count} review{count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ) : count === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-5 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 text-amber-500">
            <IconStar className="h-5 w-5" filled />
          </div>
          <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Be the first to rate this owner</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your rating helps other renters decide who to trust.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-semibold text-white">
                    {(r.profiles?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {r.profiles?.name?.trim() || 'Renter'}
                      {r.reviewer_id === currentUser?.id && <span className="ml-1.5 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">You</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StarRow value={r.rating} size="xs" />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {r.comment && (
                <p className="mt-2.5 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{r.comment}</p>
              )}
            </li>
          ))}

          {reviews.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              {showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </ul>
      )}

      {/* Review form — rendered for non-owner authenticated users, or a prompt for guests */}
      {isOwner ? null : !currentUser ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-fuchsia-500/10">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rented from this owner?</div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Log in to leave a star rating and review.</div>
          </div>
          <button
            onClick={onLoginRequired}
            className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg"
          >
            Log in to review
          </button>
        </div>
      ) : (mine && !editing) ? (
        <div className="mt-5 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <IconCheck className="h-3.5 w-3.5" />
              Your review is live
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-emerald-700 underline underline-offset-2 transition hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
            >
              Edit
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StarRow value={mine.rating} size="sm" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {new Date(mine.updated_at || mine.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {mine.comment && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{mine.comment}</p>}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {mine ? 'Update your review' : `Rate ${ownerName}`}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Honest reviews help other renters choose safe owners.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <StarInput value={draftRating} onChange={setDraftRating} />
            {draftRating > 0 && (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {['Poor', 'Fair', 'Good', 'Great', 'Excellent'][draftRating - 1]}
              </span>
            )}
          </div>

          <textarea
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="How was your experience dealing with this owner? (optional)"
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20"
          />

          {formErr && (
            <div className="mt-2 rounded-lg border border-red-100 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{formErr}</div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{draftComment.length}/1000</span>
            <div className="flex gap-2">
              {mine && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraftRating(mine.rating);
                    setDraftComment(mine.comment || '');
                    setFormErr('');
                  }}
                  className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-300"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg disabled:opacity-60"
              >
                {submitting ? 'Saving…' : mine ? 'Update review' : 'Submit review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StarRow({ value, size = 'sm' }) {
  const dims = size === 'xs' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar
          key={n}
          filled={n <= Math.round(value)}
          className={`${dims} ${n <= Math.round(value) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
        />
      ))}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const show = hover || value;
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className="group p-0.5 transition active:scale-90"
        >
          <IconStar
            filled={n <= show}
            className={`h-6 w-6 transition ${n <= show ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

function IconStar({ filled = false, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Svg(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} />;
}
function IconChevron(p)  { return <Svg {...p}><polyline points="9 6 15 12 9 18" /></Svg>; }
function IconPin(p)      { return <Svg {...p}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Svg>; }
function IconShare(p)    { return <Svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></Svg>; }
function IconHeart({ filled, ...p }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function IconFlag(p)     { return <Svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></Svg>; }
function IconVerified(p) { return <Svg {...p}><path d="M9 12l2 2 4-4"/><path d="M12 2l2.5 2.5L18 4l-.5 3.5L20 10l-2 3 2 3-3.5-.5L18 20l-3.5-.5L12 22l-2.5-2.5L6 20l.5-3.5L4 14l2-3-2-3 3.5.5L6 4l3.5.5z"/></Svg>; }
function IconCheck(p)    { return <Svg {...p}><polyline points="20 6 9 17 4 12"/></Svg>; }
function IconLock(p)     { return <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>; }
function IconUnlock(p)   { return <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></Svg>; }
function IconPhone(p)    { return <Svg {...p}><path d="M22 16.92V21a1 1 0 0 1-1.09 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 3.18 4.09 1 1 0 0 1 4.18 3h4.09a1 1 0 0 1 1 .75 12 12 0 0 0 .66 2.65 1 1 0 0 1-.23 1L8.09 9.01a16 16 0 0 0 6 6l1.61-1.61a1 1 0 0 1 1-.23 12 12 0 0 0 2.65.66 1 1 0 0 1 .75 1z"/></Svg>; }
function IconShield(p)   { return <Svg {...p}><path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z"/></Svg>; }
function IconSparkle(p)  { return <Svg {...p}><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M5.6 18.4l2.8-2.8"/><path d="M15.6 8.4l2.8-2.8"/></Svg>; }
function IconKey(p)      { return <Svg {...p}><circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12l10-10"/><path d="M17 6l3 3"/></Svg>; }
function IconUsers(p)    { return <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>; }
function IconSofa(p)     { return <Svg {...p}><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v3H6v-3a2 2 0 0 0-4 0z"/><path d="M6 18v2"/><path d="M18 18v2"/></Svg>; }
function IconRupee(p)    { return <Svg {...p}><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l9 9"/><path d="M6 13c0-2.5 2-4.5 5.5-4.5"/></Svg>; }
function IconInfo(p)     { return <Svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></Svg>; }
function IconArrowRight(p){ return <Svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Svg>; }
