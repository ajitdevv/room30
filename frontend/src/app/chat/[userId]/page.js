'use client';
import { Suspense, use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatListingNumber } from '@/lib/format';
import SubscriptionModal from '@/app/_components/SubscriptionModal';

export default function ChatRoomWrapper({ params }) {
  const { userId } = use(params);
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 text-[var(--muted)]">Loading…</div>}>
      <ChatRoom userId={userId} />
    </Suspense>
  );
}

function ChatRoom({ userId }) {
  const sp = useSearchParams();
  const propertyIdParam = sp.get('property');

  const [me, setMe] = useState(null);
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [properties, setProperties] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const scrollRef = useRef(null);
  const router = useRouter();
  // Pauses the 4s poll when tab isn't visible — stops pointless re-renders.
  const visibleRef = useRef(true);
  // Fingerprint of last-loaded messages; only setState if this actually changes.
  const lastSigRef = useRef('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) { router.push('/login'); return; }
      setMe(u);
      load();
    });
    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) load(); // catch up on return
    };
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => { if (visibleRef.current) load(); }, 4000);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages]);

  async function load() {
    try {
      const r = await apiGet(`/api/chat/${userId}`, { auth: true });
      const msgs = r.messages || [];
      // Signature of the thread: count + last id. Lets us no-op when nothing changed.
      const sig = `${msgs.length}:${msgs.at(-1)?.id || ''}`;
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setMessages(msgs);
      }
      // other and properties only set if the identity changes.
      setOther((prev) => (prev?.id === r.other?.id ? prev : r.other || null));
      setProperties((prev) => (prev.length === (r.properties?.length || 0) ? prev : r.properties || []));
    } catch (e) { setErr(friendlyError(e, { context: 'chat' })); }
  }

  async function send(e) {
    if (e) e.preventDefault();
    const body = (e && text.trim()) ? text : pendingText;
    if (!body.trim()) return;
    setSending(true); setErr('');
    try {
      await apiPost('/api/chat', {
        receiver_id: userId,
        property_id: propertyIdParam || undefined,
        message: body,
      });
      setText('');
      setPendingText('');
      load();
    } catch (e) {
      if (e.status === 402) {
        setPendingText(body);
        setShowSub(true);
      } else {
        setErr(friendlyError(e, { context: 'chat' }));
      }
    } finally {
      setSending(false);
    }
  }

  const contextProperty =
    (propertyIdParam && properties.find((p) => p.id === propertyIdParam))
    || properties[0]
    || null;

  const grouped = groupByDay(messages);

  return (
    <div className="mx-auto flex h-[calc(100vh-88px)] max-w-3xl flex-col px-4 py-4 sm:px-6">
      <header className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <Link href="/chat" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--elevated)] hover:text-[var(--fg)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <Avatar name={other?.name} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold tracking-tight">{other?.name || 'User'}</div>
          {other?.role && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {other.role}
            </div>
          )}
        </div>
      </header>

      {contextProperty && (
        <Link
          href={`/property/${contextProperty.id}`}
          className="mt-2 block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-indigo-400/60"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white dark:bg-white/10">
              {formatListingNumber(contextProperty.listing_number)}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">About this property</span>
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight line-clamp-1">{contextProperty.title}</div>
          <div className="text-xs text-[var(--muted)]">
            {contextProperty.locality}, {contextProperty.city} · <span className="text-indigo-500 font-semibold">₹{contextProperty.rent?.toLocaleString('en-IN')}/mo</span>
          </div>
        </Link>
      )}

      <div ref={scrollRef} className="mt-2 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--elevated)] text-[var(--muted)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div className="mt-3 text-sm text-[var(--muted)]">No messages yet. Say hello.</div>
            </div>
          </div>
        ) : grouped.map(([day, group]) => (
          <div key={day} className="space-y-2">
            <div className="sticky top-0 z-10 flex justify-center">
              <span className="rounded-full bg-[var(--elevated)]/90 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] backdrop-blur">{day}</span>
            </div>
            {group.map((m) => {
              const mine = m.sender_id === me?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    mine
                      ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white rounded-br-md'
                      : 'bg-[var(--elevated)] text-[var(--fg)] rounded-bl-md'
                  }`}>
                    {m.property_id && m.property_id !== contextProperty?.id && (
                      <PropertyChip id={m.property_id} list={properties} mine={mine} />
                    )}
                    <div>{m.message}</div>
                    <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-[var(--subtle)]'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {err && <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 pr-12 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          type="submit" disabled={sending || !text.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          )}
        </button>
      </form>

      <SubscriptionModal
        open={showSub}
        onClose={() => setShowSub(false)}
        reason="Keep chatting"
        title="Subscribe to continue the conversation"
        onSuccess={() => { setShowSub(false); send(); }}
      />
    </div>
  );
}

function Avatar({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const hue = (initial.charCodeAt(0) * 37) % 360;
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 50%))` }}
    >
      {initial}
    </span>
  );
}

function PropertyChip({ id, list, mine }) {
  const p = list.find((x) => x.id === id);
  if (!p) return null;
  return (
    <Link
      href={`/property/${p.id}`}
      className={`mb-1.5 block rounded-lg border px-2 py-1 text-[11px] ${
        mine ? 'border-white/30 bg-white/15 text-white/90' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <span className="font-mono">{formatListingNumber(p.listing_number)}</span> · {p.title}
    </Link>
  );
}

function groupByDay(messages) {
  const out = [];
  let current = null;
  for (const m of messages) {
    const day = new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (!current || current[0] !== day) { current = [day, []]; out.push(current); }
    current[1].push(m);
  }
  return out;
}
