'use client';
import { useEffect, useState } from 'react';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444'];

export default function CelebrationOverlay({ show, onDone }) {
  const [pieces] = useState(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.4,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 6,
    rot: Math.random() * 360,
    drift: (Math.random() - 0.5) * 40,
  })));

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), 3200);
    return () => clearTimeout(t);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {/* Confetti */}
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute block"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            background: p.color,
            borderRadius: '2px',
            animation: `confetti-fall ${p.duration}s cubic-bezier(.25,.8,.35,1) ${p.delay}s forwards`,
            transform: `rotate(${p.rot}deg)`,
            '--drift': `${p.drift}vw`,
          }}
        />
      ))}

      {/* Centered message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-celebrate-pop rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">You&apos;re live!</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Your listing is published — renters can find it now.</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Ready to rent
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrate-pop {
          0%   { transform: scale(.6) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.05) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-celebrate-pop {
          animation: celebrate-pop .7s cubic-bezier(.25,1.4,.35,1) both;
        }
      `}</style>
    </div>
  );
}
