'use client';
import { useState } from 'react';
import { useSaved } from '@/lib/useSaved';

export default function SaveButton({
  propertyId,
  variant = 'overlay', // 'overlay' (absolute on card) | 'inline' (pill button) | 'compact' (icon only)
  onToggle,
  className = '',
  stopEvent = true,
}) {
  const { isSaved, toggle, mounted } = useSaved();
  const [burst, setBurst] = useState(false);
  const saved = mounted && isSaved(propertyId);

  function handle(e) {
    if (stopEvent) { e.preventDefault(); e.stopPropagation(); }
    const nowSaved = toggle(propertyId);
    if (nowSaved) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    onToggle?.(nowSaved);
  }

  const heart = (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-all ${saved ? 'fill-red-500 text-red-500' : 'fill-none text-current'} ${burst ? 'scale-125' : 'scale-100'}`}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );

  if (variant === 'overlay') {
    return (
      <button
        onClick={handle}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:scale-110 active:scale-95 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-200 ${className}`}
      >
        {heart}
        {burst && <Burst />}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handle}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] transition hover:border-red-400 hover:text-red-500 ${className}`}
      >
        {heart}
        {burst && <Burst />}
      </button>
    );
  }

  // inline pill
  return (
    <button
      onClick={handle}
      aria-label={saved ? 'Remove from saved' : 'Save'}
      className={`relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${
        saved
          ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-red-400 hover:text-red-500'
      } ${className}`}
    >
      {heart}
      {saved ? 'Saved' : 'Save'}
      {burst && <Burst />}
    </button>
  );
}

function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <span
          key={deg}
          className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-red-500"
          style={{ animation: `burst-${deg} .6s ease-out forwards` }}
        />
      ))}
      <style jsx>{`
        @keyframes burst-0   { to { transform: translate(0, -18px) scale(0); opacity: 0 } }
        @keyframes burst-60  { to { transform: translate(16px, -10px) scale(0); opacity: 0 } }
        @keyframes burst-120 { to { transform: translate(16px, 10px) scale(0); opacity: 0 } }
        @keyframes burst-180 { to { transform: translate(0, 18px) scale(0); opacity: 0 } }
        @keyframes burst-240 { to { transform: translate(-16px, 10px) scale(0); opacity: 0 } }
        @keyframes burst-300 { to { transform: translate(-16px, -10px) scale(0); opacity: 0 } }
      `}</style>
    </span>
  );
}
