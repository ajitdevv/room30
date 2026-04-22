'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import ImageUpload from './ImageUpload';
import CelebrationOverlay from './CelebrationOverlay';

const CITY = 'Jaipur';
const JAIPUR_LOCALITIES = [
  'Vaishali Nagar', 'Malviya Nagar', 'Mansarovar', 'C-Scheme',
  'Raja Park', 'Jagatpura', 'Tonk Road', 'Sitapura',
  'Bapu Nagar', 'Durgapura', 'Pratap Nagar', 'Jhotwara',
];
const AMENITY_OPTIONS = [
  { k: 'Wi-Fi', icon: 'M5 12a14 14 0 0114 0 M8 15a8 8 0 018 0 M12 18h0' },
  { k: 'AC', icon: 'M3 5h18M3 10h18M3 15h18M3 20h18' },
  { k: 'Parking', icon: 'M7 4h6a5 5 0 010 10H9v6H7z' },
  { k: 'Kitchen', icon: 'M6 2h12v6H6z M7 8v13 M17 8v13 M6 21h12' },
  { k: 'Laundry', icon: 'M3 3h18v18H3z M12 8a5 5 0 110 10 5 5 0 010-10z M12 8v0' },
  { k: 'Gym', icon: 'M6 4v4M18 4v4M6 16v4M18 16v4M4 10h16v4H4z' },
  { k: 'Security', icon: 'M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z' },
  { k: 'Lift', icon: 'M6 3h12v18H6z M10 7l2-2 2 2 M10 17l2 2 2-2' },
  { k: 'Water', icon: 'M12 2l6 9a6 6 0 11-12 0z' },
  { k: 'Power backup', icon: 'M13 2L3 14h9l-1 8 10-12h-9z' },
];

const ROOM_TYPES = [
  { k: '1rk',    t: '1 RK',      d: 'One room + kitchen' },
  { k: '1bhk',   t: '1 BHK',     d: 'One bedroom + living' },
  { k: '2bhk',   t: '2 BHK',     d: 'Two bedrooms' },
  { k: '3bhk',   t: '3 BHK',     d: 'Three bedrooms' },
  { k: 'pg',     t: 'PG',        d: 'Paying guest' },
  { k: 'shared', t: 'Shared',    d: 'Shared room' },
];

const TENANT_TYPES = [
  { k: 'any',          t: 'Anyone',        icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 108 0 4 4 0 00-8 0' },
  { k: 'student',      t: 'Student',       icon: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
  { k: 'family',       t: 'Family',        icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
  { k: 'professional', t: 'Professional',  icon: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z' },
];

const FURNISHING = [
  { k: 'unfurnished', t: 'Unfurnished', d: 'Empty rooms' },
  { k: 'semi',        t: 'Semi',        d: 'Basics included' },
  { k: 'full',        t: 'Fully',       d: 'Move in ready' },
];

const EMPTY = {
  title: '', description: '',
  room_type: '1bhk', tenant_type: 'any',
  rent: '', deposit: '',
  city: CITY, locality: '',
  owner_phone: '', available_from: '',
  furnishing: 'semi',
  amenities: [], imageUrls: [],
};

export default function PropertyWizard({ onCreated }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const toggleAmenity = (a) => setData((d) => ({
    ...d,
    amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a],
  }));

  function validateStep() {
    if (step === 1) {
      if (!data.title.trim() || data.title.trim().length < 3) return 'Give your listing a title (at least 3 characters)';
      return null;
    }
    if (step === 2) {
      if (!data.rent || Number(data.rent) <= 0) return 'Monthly rent is required';
      if (!data.locality.trim()) return 'Locality is required';
      if (!/^[0-9+\- ]{7,15}$/.test(data.owner_phone.trim())) return 'Enter a valid contact phone';
      return null;
    }
    return null;
  }

  function next() {
    const problem = validateStep();
    if (problem) { setErr(problem); return; }
    setErr('');
    setStep((s) => Math.min(3, s + 1));
  }
  function back() { setErr(''); setStep((s) => Math.max(1, s - 1)); }

  async function submit() {
    setErr(''); setBusy(true);
    const payload = {
      title: data.title.trim(),
      description: data.description.trim() || undefined,
      rent: Number(data.rent),
      deposit: Number(data.deposit || 0),
      city: CITY,
      locality: data.locality.trim(),
      owner_phone: data.owner_phone.trim(),
      tenant_type: data.tenant_type,
      furnishing: data.furnishing,
      room_type: data.room_type,
      amenities: data.amenities,
      available_from: data.available_from || undefined,
      images: data.imageUrls,
    };
    try {
      const res = await apiPost('/api/properties', payload);
      if (res.warning) console.warn('[publish]', res.warning);
      setDone(true);
      setCelebrate(true);
      setTimeout(() => {
        setDone(false);
        setData(EMPTY);
        setStep(1);
        onCreated?.();
      }, 3300);
    } catch (e) {
      console.error('[publish] failed', { payload, error: e, body: e.body });
      const msg =
        typeof e.body?.error === 'string' ? e.body.error
        : e.body?.details ? `${e.body.error || 'Error'} — ${e.body.details}`
        : e.message || 'Publish failed';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  const progress = ((step - 1) / 2) * 100;

  if (done) {
    return (
      <>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight">Listing published</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Renters can see it now. We&apos;ll notify you when chats come in.</p>
        </div>
        <CelebrationOverlay show={celebrate} onDone={() => setCelebrate(false)} />
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Header + progress */}
      <div className="relative border-b border-[var(--border)] bg-gradient-to-b from-indigo-50/40 to-transparent px-6 pt-5 pb-4 dark:from-indigo-500/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Step {step} of 3</div>
            <div className="mt-0.5 text-lg font-semibold tracking-tight">
              {step === 1 && 'Tell us about your place'}
              {step === 2 && 'Pricing & contact'}
              {step === 3 && 'Amenities & photos'}
            </div>
          </div>
          <StepDots step={step} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="px-6 py-6">
        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && <Step3 data={data} toggleAmenity={toggleAmenity} setImages={(urls) => update({ imageUrls: urls })} />}

        {err && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            {err}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--border-strong)] disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.98]"
          >
            Continue
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <><Spinner/> Publishing…</>
            ) : (
              <>Publish listing
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M2 21L23 12 2 3v7l15 2-15 2z"/></svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Spinner() { return (
  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
);}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 rounded-full transition-all ${
          n === step ? 'w-6 bg-indigo-500' : n < step ? 'w-2 bg-indigo-500/60' : 'w-2 bg-[var(--border-strong)]'
        }`}/>
      ))}
    </div>
  );
}

function Step1({ data, update }) {
  return (
    <div className="space-y-5">
      <Field label="Catchy title" hint="This is the first thing renters see.">
        <input
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Bright 2BHK near Vaishali metro"
          maxLength={120}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
        />
        <div className="mt-1 text-right text-[10px] text-[var(--subtle)]">{data.title.length}/120</div>
      </Field>

      <div>
        <SubLabel>Room type</SubLabel>
        <div className="grid grid-cols-3 gap-2">
          {ROOM_TYPES.map((r) => (
            <ChoiceCard key={r.k} active={data.room_type === r.k} onClick={() => update({ room_type: r.k })}>
              <div className="text-sm font-semibold">{r.t}</div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">{r.d}</div>
            </ChoiceCard>
          ))}
        </div>
      </div>

      <div>
        <SubLabel>Who&apos;s it for?</SubLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TENANT_TYPES.map((t) => (
            <ChoiceCard key={t.k} active={data.tenant_type === t.k} onClick={() => update({ tenant_type: t.k })}>
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${data.tenant_type === t.k ? 'bg-indigo-500 text-white' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
              </div>
              <div className="text-sm font-semibold">{t.t}</div>
            </ChoiceCard>
          ))}
        </div>
      </div>

      <Field label="Short description" hint="Optional — what makes this place great?">
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          maxLength={3000}
          placeholder="Quiet neighbourhood, park across the street, 5 min from metro…"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
        />
      </Field>
    </div>
  );
}

function Step2({ data, update }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly rent">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">₹</span>
            <input
              type="number" min="0"
              value={data.rent}
              onChange={(e) => update({ rent: e.target.value })}
              placeholder="15000"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 pl-8 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">/month</span>
          </div>
        </Field>
        <Field label="Refundable deposit" hint="Usually 1–2× rent.">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">₹</span>
            <input
              type="number" min="0"
              value={data.deposit}
              onChange={(e) => update({ deposit: e.target.value })}
              placeholder="30000"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 pl-8 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </Field>
      </div>

      <Field label="Locality" hint="Where is it exactly?">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input
            value={data.locality}
            onChange={(e) => update({ locality: e.target.value })}
            placeholder="Vaishali Nagar"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 pl-10 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {JAIPUR_LOCALITIES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => update({ locality: loc })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                data.locality === loc
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-indigo-400 hover:text-indigo-500'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Your contact number" hint="Shared only with subscribers after unlock.">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92V21a1 1 0 01-1.09 1 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 013.18 4.09 1 1 0 014.18 3h4.09a1 1 0 011 .75 12 12 0 00.66 2.65 1 1 0 01-.23 1L8.09 9.01a16 16 0 006 6l1.61-1.61a1 1 0 011-.23 12 12 0 002.65.66 1 1 0 01.75 1z"/></svg>
          <input
            type="tel"
            value={data.owner_phone}
            onChange={(e) => update({ owner_phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 pl-10 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Available from" hint="Leave blank if immediate.">
          <input
            type="date"
            value={data.available_from}
            onChange={(e) => update({ available_from: e.target.value })}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[15px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
          />
        </Field>
        <div>
          <SubLabel>Furnishing</SubLabel>
          <div className="grid grid-cols-3 gap-2">
            {FURNISHING.map((f) => (
              <ChoiceCard key={f.k} active={data.furnishing === f.k} onClick={() => update({ furnishing: f.k })}>
                <div className="text-sm font-semibold">{f.t}</div>
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">{f.d}</div>
              </ChoiceCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, toggleAmenity, setImages }) {
  return (
    <div className="space-y-6">
      <div>
        <SubLabel>Amenities <span className="font-normal text-[var(--subtle)]">· {data.amenities.length} selected</span></SubLabel>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => {
            const on = data.amenities.includes(a.k);
            return (
              <button
                key={a.k}
                type="button"
                onClick={() => toggleAmenity(a.k)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-indigo-400 hover:text-indigo-500'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon}/></svg>
                {a.k}
                {on && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ImageUpload urls={data.imageUrls} onChange={setImages} />

      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          Review
        </div>
        <div className="mt-3 text-[15px] font-semibold tracking-tight">
          {data.title || <span className="text-[var(--subtle)] font-normal">No title yet</span>}
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          {data.locality || '—'}, {data.city} · <span className="font-semibold text-indigo-500">₹{Number(data.rent || 0).toLocaleString('en-IN')}/mo</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
          <Chip>{data.room_type.toUpperCase()}</Chip>
          <Chip>{data.furnishing}</Chip>
          <Chip>{data.tenant_type}</Chip>
          <Chip>{data.imageUrls.length} photo{data.imageUrls.length === 1 ? '' : 's'}</Chip>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
        {hint && <span className="text-[10px] text-[var(--subtle)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function SubLabel({ children }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{children}</div>;
}

function ChoiceCard({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-[var(--ring)] dark:bg-indigo-500/10'
          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]'
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ children }) {
  return <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">{children}</span>;
}
