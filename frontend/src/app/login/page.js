'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { friendlyAuthError } from '@/lib/errors';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-[var(--muted)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('renter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next');

  async function onSubmit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name, role } },
        });
        if (error) throw error;
      }
      const dest = next || (role === 'owner' ? '/dashboard' : '/listings');
      router.push(dest);
    } catch (e2) {
      let msg = friendlyAuthError(e2, mode);

      // Special handling for invalid credentials in signin: check if email is registered
      if (msg === '__CHECK_EMAIL__') {
        try {
          const res = await fetch('/api/me/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          if (!res.ok) throw new Error('Check failed');
          const data = await res.json();
          msg = data.exists
            ? 'Incorrect password. Please try again or reset your password.'
            : 'You are not signed up with this email. Create an account to get started.';
        } catch (err) {
          console.error('Email check error:', err);
          msg = 'Incorrect email or password. Please check and try again.';
        }
      }

      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-160px)]">
      <div className="absolute inset-0 -z-10 bg-aurora bg-noise" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        {/* Left: Marketing panel */}
        <div className="hidden lg:block">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Welcome to Room30</div>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight leading-[1.1]">
            Your next <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 bg-clip-text text-transparent">home</span> starts with a conversation.
          </h2>
          <p className="mt-4 max-w-md text-[var(--muted)]">
            Direct-to-owner rentals across Jaipur. No brokers, no middlemen, no nonsense.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ['1,200+', 'verified live listings'],
              ['4 days', 'average move-in time'],
              ['0%', 'brokerage fee, ever'],
            ].map(([k, v]) => (
              <li key={v} className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight text-indigo-500">{k}</span>
                <span className="text-sm text-[var(--muted)]">{v}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['A', 'R', 'P', 'S'].map((i, n) => (
                <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-[var(--bg)] ${['bg-indigo-500','bg-fuchsia-500','bg-emerald-500','bg-amber-500'][n]}`}>{i}</span>
              ))}
            </div>
            <div className="text-sm text-[var(--muted)]">Joined by 3,400+ renters this month</div>
          </div>
        </div>

        {/* Right: Auth form */}
        <div className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="px-8 pt-8 pb-2">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <Link href="/" className="text-xs text-[var(--muted)] hover:text-indigo-500">Home →</Link>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {mode === 'signin' ? 'Sign in to chat and manage listings.' : 'Takes about 30 seconds.'}
              </p>
            </div>

            {mode === 'signup' && (
              <div className="px-8 pt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">I want to…</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <RoleCard active={role === 'renter'} onClick={() => setRole('renter')}
                    title="Find a room" desc="Browse and chat with owners."
                    icon="M3 10l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>
                  <RoleCard active={role === 'owner'} onClick={() => setRole('owner')}
                    title="List a property" desc="Post rooms, flats, or PGs."
                    icon="M12 5v14M5 12h14"/>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3 px-8 pt-6 pb-2">
              {mode === 'signup' && (
                <Field label="Name" value={name} onChange={setName} placeholder="Jane Doe" />
              )}
              <Field type="email" label="Email" value={email} onChange={setEmail} placeholder="you@example.com" required />
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPw ? 'text' : 'password'} required minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--fg)]" aria-label="Toggle password">
                    {showPw ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M17.9 17.9A10 10 0 0112 19C5 19 1 12 1 12a19.8 19.8 0 015.2-6.2M23 12s-1.6 2.8-4.3 5.1M9.9 4.2A10 10 0 0112 4c7 0 11 8 11 8"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                  {err}
                </div>
              )}

              <button
                type="submit" disabled={busy}
                className="mt-2 w-full rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : `Create ${role} account`}
              </button>
            </form>

            <div className="px-8 pb-8">
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="mt-4 w-full text-center text-sm text-[var(--muted)] transition hover:text-indigo-500"
              >
                {mode === 'signin' ? (
                  <>New to Room30? <span className="font-semibold text-[var(--fg)] underline underline-offset-2">Create an account</span></>
                ) : (
                  <>Already have an account? <span className="font-semibold text-[var(--fg)] underline underline-offset-2">Sign in</span></>
                )}
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--subtle)]">
            By continuing you agree to our <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>
      <input
        type={type} required={required}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>
  );
}

function RoleCard({ active, onClick, title, desc, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-fuchsia-50 ring-2 ring-[var(--ring)] dark:from-indigo-500/10 dark:to-fuchsia-500/10'
          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]'
      }`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white' : 'bg-[var(--elevated)] text-[var(--muted)]'}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--muted)]">{desc}</div>
    </button>
  );
}
