import React from 'react';

/**
 * MetricsBar — Shopify Polaris `s-metrics-bar`. A thin, flat strip of metric
 * cells (NOT big bordered KPI cards). Each cell: small muted heading, an 18px
 * number, an optional muted % delta (green up / red down), and an optional
 * faint single-stroke sparkline. Cells are separated ONLY by hairline dividers.
 *
 * Restraint is the whole point — small type, no per-cell box/shadow, desaturated
 * delta. Numbers degrade to '–' when null/undefined (honesty rule: no faking).
 *
 * @param {Array<{key?,label,value,delta?:{dir:'up'|'down',pct:string},spark?:number[]}>} props.metrics
 */
const PLACEHOLDER = '–';

function Sparkline({ points }) {
  if (!points || points.length < 2) return null;
  const w = 64;
  const h = 20;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / span) * (h - 2) - 1).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-5 w-16 shrink-0" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={d}
        fill="none"
        stroke="var(--color-admin-text-faint)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MetricsBar({ metrics = [], className = '' }) {
  if (!metrics.length) return null;
  return (
    <div
      className={`flex divide-x divide-admin-border-soft overflow-hidden rounded-[var(--radius-admin)] border border-admin-border bg-admin-surface ${className}`}
    >
      {metrics.map((m, i) => {
        const value = m.value === null || m.value === undefined ? PLACEHOLDER : m.value;
        return (
          <div key={m.key || m.label || i} className="min-w-0 flex-1 px-3 py-2">
            <div className="text-[12px] text-admin-text-muted">{m.label}</div>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-semibold leading-5 text-admin-text tabular-nums">{value}</span>
                {m.delta && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums"
                    style={{ color: m.delta.dir === 'down' ? 'var(--color-admin-neg-delta)' : 'var(--color-admin-pos-delta)' }}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      {m.delta.dir === 'down' ? (
                        <path d="M9 3.5v4.8L3.7 3 3 3.7 8.3 9H3.5v1H10V3.5z" />
                      ) : (
                        <path d="M3 3.5v1h4.8L2.5 9.8l.7.7L8.5 5.2V10h1V3.5z" />
                      )}
                    </svg>
                    {m.delta.pct}
                  </span>
                )}
              </div>
              {m.spark && <Sparkline points={m.spark} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
