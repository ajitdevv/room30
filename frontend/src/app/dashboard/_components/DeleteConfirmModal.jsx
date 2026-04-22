'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DeleteConfirmModal({ property, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [phase, setPhase] = useState('confirm'); // confirm | deleting | done

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && phase === 'confirm') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, phase]);

  async function confirmDelete() {
    setErr('');
    setBusy(true);
    setPhase('deleting');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/properties/${property.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Delete failed');
      }
      setPhase('done');
      setTimeout(() => {
        onDeleted?.();
        onClose?.();
      }, 2200);
    } catch (e) {
      setErr(e.message);
      setPhase('confirm');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-up" onClick={() => phase === 'confirm' && onClose?.()}>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'confirm' && (
          <div className="px-6 pt-7 pb-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Delete this listing?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-[var(--fg)]">{property.title}</span> will be hidden from renters. You have <span className="font-semibold text-[var(--fg)]">90 days</span> to restore it from your dashboard — after that, it&apos;s gone for good.
            </p>

            {err && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={onClose} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--elevated)]">
                Keep it
              </button>
              <button onClick={confirmDelete} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition hover:bg-red-500 disabled:opacity-50">
                {busy ? 'Removing…' : 'Yes, delete it'}
              </button>
            </div>
          </div>
        )}

        {phase === 'deleting' && (
          <div className="px-6 py-16 text-center">
            <SadFace />
            <p className="mt-5 text-sm text-[var(--muted)] animate-fade-up">Taking it down…</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-6 py-14 text-center">
            <SadFace done />
            <h3 className="mt-5 text-xl font-semibold tracking-tight">Sorry to see it go</h3>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              You had one less room for the city. Restore it anytime in the next 90 days.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Permanent removal in 90 days
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SadFace({ done = false }) {
  return (
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-900 ${done ? 'scale-100' : 'animate-pulse'}`} />
      <svg viewBox="0 0 100 100" className="relative h-16 w-16 text-white">
        <circle cx="32" cy="40" r="4" fill="currentColor" />
        <circle cx="68" cy="40" r="4" fill="currentColor" />
        {/* frown */}
        <path d="M30 72 Q 50 58 70 72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
        {/* tear */}
        <path className={done ? 'opacity-100' : 'opacity-0 animate-[fade-up_.4s_.6s_both]'} d="M32 48 Q 31 54 30 58 Q 29 62 32 62 Q 35 62 34 58 Q 33 54 32 48" fill="#60a5fa"/>
      </svg>
    </div>
  );
}
