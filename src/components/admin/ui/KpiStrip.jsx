import React from 'react';
import { Card } from './Card';

/**
 * KpiStrip — the top metric row on Admin Neutral list pages (Orders, Products…).
 *
 * Renders a responsive row of metric cards. Designed to degrade gracefully:
 * a metric whose `value` is null/undefined shows the placeholder '–' (matching
 * the existing getCountFromServer degrade behavior), so we never render a
 * misleading 0 when a count failed to load.
 *
 * HONESTY RULE (docs/ADMIN_REDESIGN_PLAN.md §7): only pass metrics we can
 * compute from real data. Don't fabricate Inventory/Risk/Conversion just
 * because Shopify shows them.
 *
 * @param {Array<{key?:string,label:string,value:React.ReactNode,sublabel?:string,tone?:string}>} props.metrics
 */
const PLACEHOLDER = '–';

export default function KpiStrip({ metrics = [], className = '' }) {
  if (!metrics.length) return null;
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {metrics.map((m, i) => {
        const value = m.value === null || m.value === undefined ? PLACEHOLDER : m.value;
        return (
          <Card key={m.key || m.label || i} className="px-4 py-3">
            <div className="text-[13px] font-medium text-admin-text-muted">{m.label}</div>
            <div className="mt-1 text-[22px] font-semibold leading-7 text-admin-text tabular-nums">{value}</div>
            {m.sublabel && (
              <div className="mt-0.5 text-[12px] text-admin-text-muted">{m.sublabel}</div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
