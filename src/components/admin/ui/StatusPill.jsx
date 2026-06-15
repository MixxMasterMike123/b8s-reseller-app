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

const TONE_CLASSES = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  positive: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  attention: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300',
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

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
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
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${toneClass} ${sizeClass} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}
