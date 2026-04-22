'use client';
import { useMemo } from 'react';

// Small SVG line chart with gradient fill + hoverable points.
// series: [{ date: 'YYYY-MM-DD', value: number }, ...]
export function LineChart({ series = [], height = 220, label = 'Value', color = '#6366f1' }) {
  const dims = { w: 800, h: height, pl: 34, pr: 8, pt: 10, pb: 24 };
  const { path, area, points, max, last } = useMemo(() => {
    if (!series.length) return { path: '', area: '', points: [], max: 0, last: 0 };
    const vs = series.map((s) => Number(s.value) || 0);
    const max = Math.max(1, ...vs);
    const xStep = (dims.w - dims.pl - dims.pr) / Math.max(1, series.length - 1);
    const ys = (v) => dims.h - dims.pb - ((v / max) * (dims.h - dims.pt - dims.pb));
    const points = series.map((s, i) => ({
      x: dims.pl + i * xStep,
      y: ys(Number(s.value) || 0),
      date: s.date,
      value: Number(s.value) || 0,
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = path
      + ` L${points[points.length - 1].x},${dims.h - dims.pb}`
      + ` L${points[0].x},${dims.h - dims.pb} Z`;
    return { path, area, points, max, last: vs[vs.length - 1] };
  }, [series, height]);

  if (!series.length) {
    return <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">No data yet</div>;
  }

  const total = series.reduce((a, s) => a + (Number(s.value) || 0), 0);
  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight">{total.toLocaleString('en-IN')}</span>
            <span className="text-xs text-[var(--muted)]">last {series.length}d · peak {max.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          Today: {last.toLocaleString('en-IN')}
        </span>
      </div>

      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="h-[220px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={dims.pl} x2={dims.w - dims.pr}
            y1={dims.pt + (dims.h - dims.pt - dims.pb) * f}
            y2={dims.pt + (dims.h - dims.pt - dims.pb) * f}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
          />
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === points.length - 1 ? (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill={color} />
              <circle cx={p.x} cy={p.y} r="8" fill={color} fillOpacity="0.12" />
            </g>
          ) : null
        ))}

        {/* date ticks */}
        {[0, Math.floor(points.length / 2), points.length - 1].filter((i) => points[i]).map((i) => (
          <text key={i} x={points[i].x} y={dims.h - 6} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.45">
            {formatShortDate(points[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Horizontal bar list — simple "top N" style chart.
// items: [{ label, value, hint? }]
export function BarList({ title, items = [], color = '#6366f1', suffix = '' }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</div>
      {items.length === 0 ? (
        <div className="mt-6 text-sm text-[var(--muted)]">No data yet</div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) => {
            const pct = (Number(it.value) || 0) / max * 100;
            return (
              <li key={it.label}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate font-medium">{it.label}</span>
                  <span className="flex-shrink-0 tabular-nums text-[var(--muted)]">
                    {(Number(it.value) || 0).toLocaleString('en-IN')}{suffix}
                    {it.hint && <span className="ml-1.5 text-[11px]">{it.hint}</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatShortDate(iso) {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return iso; }
}
