import React from 'react';

/**
 * RightRail — the Admin Neutral two-column detail layout (Shopify order/product
 * detail grammar): a primary MAIN column for the workflow and a fixed-ish RIGHT
 * rail for metadata cards.
 *
 * Usage:
 *   <RightRail
 *     main={<>…fulfillment + payment cards…</>}
 *     rail={<>…Notes / Customer / Tags cards…</>}
 *   />
 *
 * Collapses to a single column on small screens (rail below main).
 */
export default function RightRail({ main, rail, className = '' }) {
  return (
    <div className={`grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] ${className}`}>
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="space-y-5">{rail}</aside>
    </div>
  );
}
