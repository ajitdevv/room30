'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';

const JAIPUR_LOCALITIES = [
  'Vaishali Nagar', 'Malviya Nagar', 'Mansarovar', 'C-Scheme',
  'Raja Park', 'Jagatpura', 'Tonk Road', 'Sitapura',
  'Bapu Nagar', 'Durgapura', 'Pratap Nagar', 'Jhotwara',
];

const FURNISHING = [
  { k: 'unfurnished', t: 'Unfurnished' },
  { k: 'semi',        t: 'Semi' },
  { k: 'full',        t: 'Fully' },
];
const TENANT_TYPES = [
  { k: 'any', t: 'Anyone' }, { k: 'student', t: 'Student' },
  { k: 'family', t: 'Family' }, { k: 'professional', t: 'Professional' },
];

// Availability statuses owners can pick.
const AVAILABILITY = [
  { k: 'available',  t: 'Available',      d: 'Ready to accept renters',         tone: 'emerald' },
  { k: 'lease',      t: 'On lease',       d: 'Leased for a fixed term',          tone: 'amber'   },
  { k: 'reserved',   t: 'Reserved',       d: 'Talks in progress with a renter',  tone: 'indigo'  },
  { k: 'paused',     t: 'Paused',         d: 'Hide from search temporarily',     tone: 'slate'   },
];

export default function PropertyEditModal({ property, onClose, onSaved }) {
  const [data, setData] = useState(() => ({
    title: property.title || '',
    description: property.description || '',
    rent: property.rent || '',
    deposit: property.deposit || '',
    locality: property.locality || '',
    owner_phone: property.owner_phone || '',
    available_from: property.available_from || '',
    room_type: property.room_type || '1bhk',
    tenant_type: property.tenant_type || 'any',
    furnishing: property.furnishing || 'semi',
    is_active: property.is_active !== false,
    availability: property.availability_status || (property.is_active ? 'available' : 'paused'),
  }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save() {
    setErr(''); setBusy(true);
    try {
      const body = {
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        rent: Number(data.rent),
        deposit: Number(data.deposit || 0),
        locality: data.locality.trim(),
        owner_phone: data.owner_phone.trim(),
        room_type: data.room_type,
        tenant_type: data.tenant_type,
        furnishing: data.furnishing,
        available_from: data.available_from || undefined,
        is_active: data.availability !== 'paused',
      };
      // apiPost wraps fetch; we need PATCH — use fetch directly.
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://room30.onrender.com'}/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(typeof j.error === 'string' ? j.error : res.statusText), { status: res.status, body: j });
      onSaved?.(j.property);
      onClose?.();
    } catch (e) {
      setErr(friendlyError(e, { fallback: "We couldn't save your changes. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-fade-up sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Edit listing</div>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight line-clamp-1">{property.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--fg)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Availability status */}
          <section>
            <SubLabel>Availability</SubLabel>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {AVAILABILITY.map((a) => {
                const active = data.availability === a.k;
                return (
                  <button
                    key={a.k}
                    type="button"
                    onClick={() => update({ availability: a.k })}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-[var(--ring)] dark:bg-indigo-500/10'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneClasses(a.tone)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${toneDot(a.tone)}`} />
                      {a.t}
                    </span>
                    <span className="mt-2 text-[11px] text-[var(--muted)]">{a.d}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Core fields */}
          <section className="space-y-4">
            <Field label="Title">
              <input
                value={data.title} onChange={(e) => update({ title: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={data.description} onChange={(e) => update({ description: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rent (₹/mo)">
                <input type="number" value={data.rent} onChange={(e) => update({ rent: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"/>
              </Field>
              <Field label="Deposit (₹)">
                <input type="number" value={data.deposit} onChange={(e) => update({ deposit: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"/>
              </Field>
            </div>

            <Field label="Locality">
              <input value={data.locality} onChange={(e) => update({ locality: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"/>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {JAIPUR_LOCALITIES.map((l) => (
                  <button key={l} type="button" onClick={() => update({ locality: l })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${data.locality === l ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Contact phone">
              <input type="tel" value={data.owner_phone} onChange={(e) => update({ owner_phone: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"/>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Room type">
                <select value={data.room_type} onChange={(e) => update({ room_type: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  {['1rk','1bhk','2bhk','3bhk','pg','shared'].map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
              </Field>
              <Field label="Tenant">
                <select value={data.tenant_type} onChange={(e) => update({ tenant_type: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  {TENANT_TYPES.map((t) => <option key={t.k} value={t.k}>{t.t}</option>)}
                </select>
              </Field>
              <Field label="Furnishing">
                <select value={data.furnishing} onChange={(e) => update({ furnishing: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  {FURNISHING.map((f) => <option key={f.k} value={f.k}>{f.t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Available from">
              <input type="date" value={data.available_from} onChange={(e) => update({ available_from: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"/>
            </Field>
          </section>

          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-4 backdrop-blur">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--elevated)]">Cancel</button>
          <button onClick={save} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg disabled:opacity-50">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
function SubLabel({ children }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{children}</div>;
}

function toneClasses(tone) {
  return {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    indigo:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    slate:   'bg-[var(--elevated)] text-[var(--muted)]',
  }[tone];
}
function toneDot(tone) {
  return { emerald: 'bg-emerald-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500', slate: 'bg-[var(--subtle)]' }[tone];
}
