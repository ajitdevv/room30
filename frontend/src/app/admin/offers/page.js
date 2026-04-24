'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import Pagination from '../_components/Pagination';

const PAGE_SIZE = 15;

const EMPTY = {
  kind: 'banner',
  title: '',
  subtitle: '',
  discount_label: '',
  cta_label: 'Buy a plan',
  cta_href: '/plans',
  variant: 'gradient',
  audience: 'all',
  is_active: true,
  dismissible: true,
  priority: 10,
  starts_at: '',
  ends_at: '',
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // offer obj or null
  const [showForm, setShowForm] = useState(false);

  async function refresh(targetPage = page) {
    setLoading(true);
    setErr(''); setNotice('');
    try {
      const r = await apiGet(`/api/admin/offers?page=${targetPage}&pageSize=${PAGE_SIZE}`, { auth: true });
      setOffers(r.offers || []);
      setTotal(r.total || 0);
      setNotice(r.notice || '');
    } catch (e) {
      setErr(friendlyError(e));
      if (e.body?.notice) setNotice(e.body.notice);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  function openNew() { setEditing(null); setShowForm(true); }
  function openEdit(o) { setEditing(o); setShowForm(true); }

  async function remove(id) {
    if (!confirm('Delete this offer? This cannot be undone.')) return;
    try {
      await apiDelete(`/api/admin/offers/${id}`);
      setOffers((xs) => xs.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) { alert(friendlyError(e)); }
  }

  async function toggleActive(o) {
    try {
      const r = await apiPatch(`/api/admin/offers/${o.id}`, { is_active: !o.is_active });
      setOffers((xs) => xs.map((x) => (x.id === o.id ? r.offer : x)));
    } catch (e) { alert(friendlyError(e)); }
  }

  return (
    <div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Offers</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create banners and popups to drive plan purchases. Changes appear on the live site immediately.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:brightness-110 sm:self-auto"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          New offer
        </button>
      </header>

      {err && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {err}
          {notice && <div className="mt-1 text-xs opacity-80">{notice}</div>}
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 12V8H4v4M4 12v4h16v-4M12 4v16"/></svg>
          </div>
          <div className="mt-3 text-base font-semibold">No offers yet</div>
          <p className="mt-1 text-sm text-[var(--muted)]">Create your first banner or popup to promote a plan.</p>
          <button onClick={openNew} className="mt-4 rounded-full bg-[var(--fg)] px-5 py-2 text-sm font-semibold text-[var(--bg)] hover:opacity-90">
            New offer
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {offers.map((o) => (
              <OfferRow key={o.id} o={o} onEdit={() => openEdit(o)} onDelete={() => remove(o.id)} onToggle={() => toggleActive(o)} />
            ))}
          </ul>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {showForm && (
        <OfferForm
          initial={editing || EMPTY}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setOffers((xs) => {
              const i = xs.findIndex((x) => x.id === saved.id);
              if (i >= 0) { const c = [...xs]; c[i] = saved; return c; }
              // New offer — jump to page 1 so it's visible.
              return xs;
            });
            if (!editing) { setPage(1); setTotal((t) => t + 1); refresh(1); }
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function OfferRow({ o, onEdit, onDelete, onToggle }) {
  const [now] = useState(() => Date.now());
  const endsSoon = o.ends_at && new Date(o.ends_at).getTime() - now < 48 * 3600 * 1000;
  const expired  = o.ends_at && new Date(o.ends_at).getTime() < now;

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-indigo-400/40 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <PreviewChip offer={o} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              o.kind === 'popup'
                ? 'bg-fuchsia-500/10 text-fuchsia-700 ring-1 ring-fuchsia-500/20 dark:text-fuchsia-300'
                : 'bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300'
            }`}>{o.kind}</span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              {o.audience}
            </span>
            {o.is_active ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">Live</span>
            ) : (
              <span className="rounded-full bg-[var(--elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">Paused</span>
            )}
            {expired && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300">Expired</span>
            )}
            {!expired && endsSoon && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">Ends soon</span>
            )}
          </div>
          <div className="mt-2 font-semibold tracking-tight">{o.title}</div>
          {o.subtitle && <div className="mt-0.5 line-clamp-2 text-sm text-[var(--muted)]">{o.subtitle}</div>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-snug text-[var(--muted)]">
            <span className="line-clamp-1">CTA: <span className="font-semibold text-[var(--fg)]">{o.cta_label || '—'}</span> → {o.cta_href || '/plans'}</span>
            <span>Priority: {o.priority}</span>
            {o.starts_at && <span>Starts: {formatOfferDate(o.starts_at)}</span>}
            {o.ends_at   && <span>Ends: {formatOfferDate(o.ends_at)}</span>}
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0 sm:flex-wrap sm:items-center">
          <button onClick={onToggle} className="flex-1 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-indigo-400 hover:text-indigo-500 sm:flex-none sm:py-1.5">
            {o.is_active ? 'Pause' : 'Resume'}
          </button>
          <button onClick={onEdit} className="flex-1 rounded-full bg-[var(--fg)] px-3 py-2 text-xs font-semibold text-[var(--bg)] hover:opacity-90 sm:flex-none sm:py-1.5">Edit</button>
          <button onClick={onDelete} className="flex-1 rounded-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10 sm:flex-none sm:py-1.5">Delete</button>
        </div>
      </div>
    </li>
  );
}

function PreviewChip({ offer }) {
  const bg = variantClass(offer.variant);
  return (
    <div className={`flex w-full max-w-[180px] shrink-0 flex-col items-start justify-center overflow-hidden rounded-xl px-3 py-2.5 text-white sm:w-[180px] ${bg}`}>
      {offer.discount_label && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
          {offer.discount_label}
        </span>
      )}
      <div className="mt-1 line-clamp-1 text-xs font-semibold">{offer.title}</div>
      {offer.subtitle && <div className="mt-0.5 line-clamp-1 text-[10px] opacity-90">{offer.subtitle}</div>}
    </div>
  );
}

function formatOfferDate(iso) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: '2-digit' }),
    hour: '2-digit',
    minute: '2-digit',
  });
}

function variantClass(v) {
  switch (v) {
    case 'emerald': return 'bg-gradient-to-br from-emerald-600 to-teal-700';
    case 'amber':   return 'bg-gradient-to-br from-amber-500 to-orange-600';
    case 'indigo':  return 'bg-gradient-to-br from-indigo-600 to-blue-700';
    case 'rose':    return 'bg-gradient-to-br from-rose-500 to-pink-600';
    case 'dark':    return 'bg-gradient-to-br from-slate-800 to-slate-950';
    case 'gradient':
    default:        return 'bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600';
  }
}

function OfferForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    starts_at: initial.starts_at ? toLocalInput(initial.starts_at) : '',
    ends_at:   initial.ends_at   ? toLocalInput(initial.ends_at)   : '',
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function upd(patch) { setForm((f) => ({ ...f, ...patch })); }

  async function save(e) {
    e.preventDefault();
    setErr(''); setSaving(true);
    try {
      const body = {
        kind: form.kind,
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || null,
        discount_label: form.discount_label?.trim() || null,
        cta_label: form.cta_label?.trim() || null,
        cta_href: form.cta_href?.trim() || '/plans',
        variant: form.variant,
        audience: form.audience,
        is_active: !!form.is_active,
        dismissible: !!form.dismissible,
        priority: Number(form.priority) || 0,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at:   form.ends_at   ? new Date(form.ends_at).toISOString()   : null,
      };
      const r = initial.id
        ? await apiPatch(`/api/admin/offers/${initial.id}`, body)
        : await apiPost('/api/admin/offers', body);
      onSaved(r.offer);
    } catch (e2) {
      setErr(friendlyError(e2, { fallback: "We couldn't save the offer. Please try again." }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={save}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <div className="text-lg font-semibold">{initial.id ? 'Edit offer' : 'New offer'}</div>
            <div className="text-xs text-[var(--muted)]">
              {form.kind === 'banner' ? 'Slim strip shown at the top of pages.' : 'Modal that shows once per session.'}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--elevated)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Live preview={form} />

          <Row>
            <Field label="Type">
              <Segmented value={form.kind} onChange={(v) => upd({ kind: v })} options={[['banner', 'Top banner'], ['popup', 'Popup modal']]} />
            </Field>
            <Field label="Variant">
              <Segmented value={form.variant} onChange={(v) => upd({ variant: v })} options={[
                ['gradient', 'Indigo'], ['emerald', 'Emerald'], ['amber', 'Amber'], ['indigo', 'Blue'], ['rose', 'Rose'], ['dark', 'Dark'],
              ]} />
            </Field>
          </Row>

          <Field label="Title">
            <input value={form.title} onChange={(e) => upd({ title: e.target.value })} required maxLength={120}
              placeholder="Flat 50% off on Starter plan today"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
          </Field>

          <Field label="Subtitle (optional)">
            <input value={form.subtitle || ''} onChange={(e) => upd({ subtitle: e.target.value })} maxLength={280}
              placeholder="Unlock 5 contacts for just ₹25"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
          </Field>

          <Row>
            <Field label="Discount badge (optional)">
              <input value={form.discount_label || ''} onChange={(e) => upd({ discount_label: e.target.value })} maxLength={40}
                placeholder="50% OFF"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </Field>
            <Field label="CTA label">
              <input value={form.cta_label || ''} onChange={(e) => upd({ cta_label: e.target.value })} maxLength={40}
                placeholder="Buy plan"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </Field>
          </Row>

          <Field label="CTA link">
            <input value={form.cta_href || ''} onChange={(e) => upd({ cta_href: e.target.value })} maxLength={200}
              placeholder="/plans"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
          </Field>

          <Row>
            <Field label="Audience">
              <Segmented value={form.audience} onChange={(v) => upd({ audience: v })} options={[
                ['all', 'Everyone'], ['guest', 'Guests'], ['renter', 'Renters'], ['owner', 'Owners'],
              ]} />
            </Field>
            <Field label="Priority (higher wins)">
              <input type="number" min={0} max={1000} value={form.priority} onChange={(e) => upd({ priority: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </Field>
          </Row>

          <Row>
            <Field label="Starts at (optional)">
              <input type="datetime-local" value={form.starts_at || ''} onChange={(e) => upd({ starts_at: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </Field>
            <Field label="Ends at (optional)">
              <input type="datetime-local" value={form.ends_at || ''} onChange={(e) => upd({ ends_at: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </Field>
          </Row>

          <div className="flex flex-wrap gap-4">
            <Check checked={form.is_active} onChange={(v) => upd({ is_active: v })} label="Active" hint="Shown on the live site" />
            <Check checked={form.dismissible} onChange={(v) => upd({ dismissible: v })} label="Dismissible" hint="User can close" />
          </div>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {err}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:brightness-110 disabled:opacity-50">
            {saving ? 'Saving…' : initial.id ? 'Save changes' : 'Create offer'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Live({ preview }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Preview</div>
      <div className={`overflow-hidden rounded-2xl p-4 text-white shadow-lg ${variantClass(preview.variant)}`}>
        <div className="flex items-start gap-3">
          {preview.discount_label && (
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
              {preview.discount_label}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight sm:text-base">{preview.title || 'Your headline here'}</div>
            {preview.subtitle && <div className="mt-0.5 text-xs opacity-90">{preview.subtitle}</div>}
          </div>
          {preview.cta_label && (
            <span className="shrink-0 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-900">
              {preview.cta_label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ children }) { return <div className="grid gap-4 sm:grid-cols-2">{children}</div>; }

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === v
              ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow'
              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-indigo-300'
          }`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Check({ checked, onChange, label, hint }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
      <span>
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="ml-2 text-[11px] text-[var(--muted)]">{hint}</span>}
      </span>
    </label>
  );
}

// 2026-05-10T14:30 (what <input type="datetime-local"> expects)
function toLocalInput(iso) {
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}
