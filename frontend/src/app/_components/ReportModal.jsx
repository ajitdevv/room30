'use client';
import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabaseClient';
import { formatListingNumber } from '@/lib/format';

const REASONS = [
  { value: 'fake_listing',   label: 'Fake listing / photos' },
  { value: 'wrong_info',     label: 'Wrong information' },
  { value: 'already_rented', label: 'Already rented' },
  { value: 'spam',           label: 'Spam' },
  { value: 'scam',           label: 'Scam / fraud' },
  { value: 'abusive',        label: 'Abusive behaviour' },
  { value: 'other',          label: 'Other' },
];

export default function ReportModal({ propertyId, listingNumber, onClose, onRequireLogin }) {
  const [reason, setReason] = useState('fake_listing');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { onRequireLogin?.(); return; }
      await apiPost('/api/reports', {
        property_id: propertyId,
        reason,
        description: desc.trim() || undefined,
      });
      setDone(true);
    } catch (e2) {
      setErr(friendlyError(e2, { fallback: "We couldn't submit your report. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </span>
              <h2 className="text-lg font-semibold tracking-tight">Report listing</h2>
            </div>
            <div className="mt-1 font-mono text-xs text-[var(--muted)]">{formatListingNumber(listingNumber)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--elevated)] hover:text-[var(--fg)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="mt-4 text-lg font-semibold">Report submitted</div>
            <div className="mt-1 text-sm text-[var(--muted)]">We&apos;ll review it within 24 hours.</div>
            <button onClick={onClose} className="mt-6 rounded-full bg-[var(--fg)] px-5 py-2 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Reason</div>
              <div className="mt-2 space-y-1">
                {REASONS.map((r) => (
                  <label key={r.value} className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${reason === r.value ? 'border border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border border-transparent hover:bg-[var(--elevated)]'}`}>
                    <input
                      type="radio" name="reason" value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">More details (optional)</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Tell us what's wrong so we can act faster."
                className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
              />
              <div className="mt-1 text-right text-[10px] text-[var(--subtle)]">{desc.length}/1000</div>
            </label>
            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--elevated)]">
                Cancel
              </button>
              <button type="submit" disabled={busy}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-50">
                {busy ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
