import React from 'react';

/**
 * StatusPill — the single status badge primitive for Admin Neutral.
 *
 * Consolidates the status→color meaning currently copy-pasted across
 * OrderStatusMenu, AdminOrders, AdminOrderDetail, orderVerification (see
 * docs/ADMIN_REDESIGN_PLAN.md §3.2). It does NOT hardcode labels — callers
 * pass the (translated) label as children, so meaning is preserved while
 * presentation is unified.
 *
 * `tone` selects a semantic palette. We expose the exact tones the existing
 * maps use so a drop-in replacement never changes a status's color meaning:
 *   - success  (green)   → shipped / paid / fulfilled
 *   - positive (emerald) → delivered
 *   - info     (blue)    → confirmed
 *   - warning  (yellow)  → pending / unfulfilled
 *   - attention(orange)  → processing / partially fulfilled
 *   - danger   (red)     → cancelled / failed / refunded
 *   - neutral  (gray)    → unknown / draft / default
 *
 * Convenience helpers map our domain status keys onto a tone so callers can
 * pass a raw status string instead of choosing a tone by hand.
 */

// Polaris Badge tone colors (exact hex from polaris-tokens). Light surfaces +
// dark text; subdued dark-mode variants. success/positive both green to keep
// the order-status meaning (shipped vs delivered) without a 2nd green ramp.
const TONE_CLASSES = {
  success: 'bg-[#cdfedc] text-[#014b40] dark:bg-green-900/40 dark:text-green-200',
  positive: 'bg-[#aee9d1] text-[#003d2e] dark:bg-emerald-900/50 dark:text-emerald-200',
  info: 'bg-[#eaf4ff] text-[#003a5a] dark:bg-blue-900/40 dark:text-blue-200',
  warning: 'bg-[#fff1db] text-[#5e4200] dark:bg-yellow-900/40 dark:text-yellow-200',
  attention: 'bg-[#ffd9a8] text-[#5e3b00] dark:bg-orange-900/40 dark:text-orange-200',
  danger: 'bg-[#fee8eb] text-[#8e0b21] dark:bg-red-900/40 dark:text-red-200',
  neutral: 'bg-[#e3e3e3] text-[#414141] dark:bg-gray-700/70 dark:text-gray-200',
};

// Order lifecycle status → tone. EXACTLY preserves the existing color meaning
// (yellow/blue/orange/green/emerald/red) from getStatusStyles in OrderStatusMenu
// + AdminOrders + AdminOrderDetail. Do not change without changing those.
export const ORDER_STATUS_TONE = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'attention',
  shipped: 'success',
  delivered: 'positive',
  cancelled: 'danger',
};

// Payment status → tone (Shopify-style: Paid green, Pending yellow, the rest red/gray).
export const PAYMENT_STATUS_TONE = {
  paid: 'success',
  pending: 'warning',
  unpaid: 'warning',
  refunded: 'neutral',
  failed: 'danger',
};

// Fulfillment status → tone (Shopify pattern: Unfulfilled = yellow, Fulfilled = green).
export const FULFILLMENT_STATUS_TONE = {
  fulfilled: 'success',
  unfulfilled: 'warning',
  partial: 'attention',
  cancelled: 'danger',
};

export function toneForOrderStatus(status) {
  return ORDER_STATUS_TONE[status] || 'neutral';
}

// Polaris Badge: padding 2px/8px, font 12px / medium, radius 8px (border-radius-200).
const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-[12px]',
};

/**
 * @param {object} props
 * @param {'success'|'positive'|'info'|'warning'|'attention'|'danger'|'neutral'} [props.tone='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.dot=false]  show a leading status dot
 * @param {React.ReactNode} props.children  the (translated) label
 */
export default function StatusPill({ tone = 'neutral', size = 'md', dot = false, className = '', children }) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-admin-el)] font-medium whitespace-nowrap ${toneClass} ${sizeClass} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}
