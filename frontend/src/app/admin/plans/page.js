'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { Header } from '../users/page';

export default function PlansAdmin() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    apiGet('/api/admin/plans', { auth: true })
      .then((r) => alive && setPlans(r.plans || []))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  function onSaved(updated) {
    setPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  return (
    <div>
      <Header title="Plans & pricing" subtitle="Edit plan names, prices, contact quotas, and active status." count={plans.length} />

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--elevated)]" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => <PlanCard key={p.id} plan={p} onSaved={onSaved} />)}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-xs text-[var(--muted)]">
        <div className="font-semibold text-[var(--fg)]">Note on pricing</div>
        <p className="mt-1.5 leading-relaxed">
          Prices are stored in <strong>paise</strong> (₹1 = 100 paise) — e.g. 4900 = ₹49.
          Leave <strong>Contacts</strong> empty for <strong>unlimited</strong> contacts.
          Changes take effect immediately for new purchases; existing subscriptions are unaffected.
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: plan.name,
    price: plan.price,
    contacts_limit: plan.contacts_limit === null ? '' : String(plan.contacts_limit),
    duration_days: plan.duration_days,
    is_active: plan.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        contacts_limit: form.contacts_limit === '' ? null : Number(form.contacts_limit),
        duration_days: Number(form.duration_days),
        is_active: !!form.is_active,
      };
      const r = await apiPatch(`/api/admin/plans/${plan.id}`, payload, { auth: true });
      onSaved(r.plan);
      setEdit(false);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function cancel() {
    setForm({
      name: plan.name,
      price: plan.price,
      contacts_limit: plan.contacts_limit === null ? '' : String(plan.contacts_limit),
      duration_days: plan.duration_days,
      is_active: plan.is_active,
    });
    setErr('');
    setEdit(false);
  }

  const price = Number(edit ? form.price : plan.price) || 0;

  return (
    <div className={`rounded-2xl border p-5 transition ${plan.is_active ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--elevated)]/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {edit ? (
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-lg font-semibold outline-none focus:border-indigo-400"
            />
          ) : (
            <div className="text-lg font-semibold">{plan.name}</div>
          )}
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {plan.is_active ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Active</span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Inactive</span>
            )}
          </div>
        </div>
        {!edit && (
          <button onClick={() => setEdit(true)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold transition hover:border-indigo-400 hover:text-indigo-500">
            Edit
          </button>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight">₹{Math.round(price / 100)}</span>
        {edit ? null : <span className="text-xs text-[var(--muted)]">for {plan.duration_days} days</span>}
      </div>

      {edit ? (
        <div className="mt-4 space-y-3">
          <Field label="Price (paise)" hint="e.g. 9900 = ₹99">
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="Contacts limit" hint="Empty = unlimited">
            <input
              type="number"
              value={form.contacts_limit}
              onChange={(e) => setForm({ ...form, contacts_limit: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Unlimited"
            />
          </Field>
          <Field label="Duration (days)">
            <input
              type="number"
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            Active (shown on pricing page)
          </label>

          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={cancel} className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          <KV label="Contacts">{plan.contacts_limit ?? 'Unlimited'}</KV>
          <KV label="Duration">{plan.duration_days} days</KV>
          <KV label="Price (paise)">{plan.price.toLocaleString('en-IN')}</KV>
        </ul>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</label>
      {children}
      {hint && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

function KV({ label, children }) {
  return (
    <li className="flex items-center justify-between border-b border-dashed border-[var(--border)] pb-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{children}</span>
    </li>
  );
}
