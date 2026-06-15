import React from 'react';

/**
 * Button — Admin Neutral button primitive (Shopify Polaris metrics).
 *
 * Polaris: medium button = 28px min-height, 6px/12px padding, 13px / medium
 * (550→font-semibold-ish), 8px radius. Primary = near-black #303030 fill
 * (--color-admin-primary) with white text (NO per-shop accent — full-Shopify
 * decision). Secondary = white surface + #e3e3e3 border.
 *
 *   - primary     near-black fill (the main action)
 *   - secondary   neutral surface + hairline border (default action)
 *   - plain       text-only, for low-emphasis / inline actions
 *   - destructive red, for delete/cancel
 *
 * Renders <button> by default, or <a>/Link when `as` is provided, so it can be
 * used for navigation without losing the styling. Forwards all extra props.
 */

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-[var(--radius-admin-el)] ' +
  'text-[13px] leading-5 transition-colors focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-admin-bg)] ' +
  'focus-visible:ring-[var(--color-admin-primary)] disabled:opacity-50 disabled:cursor-not-allowed';

// Heights match Polaris: micro 24, medium 28, large 32px.
const SIZES = {
  sm: 'min-h-[24px] px-2 py-1',
  md: 'min-h-[28px] px-3 py-1.5',
  lg: 'min-h-[32px] px-3 py-1.5',
};

const VARIANTS = {
  primary:
    'text-white bg-[var(--color-admin-primary)] hover:bg-[var(--color-admin-primary-hover)] dark:text-admin-bg',
  secondary:
    'text-admin-text bg-admin-surface border border-admin-border hover:bg-admin-surface-2 shadow-[var(--shadow-admin)]',
  plain:
    'text-admin-text-muted hover:text-admin-text hover:bg-admin-surface-2',
  destructive:
    'text-white bg-[#d72c0d] hover:bg-[#b81d00] active:bg-[#a01a00]',
};

export default function Button({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  className = '',
  type,
  children,
  ...rest
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.secondary;
  const sizeClass = SIZES[size] || SIZES.md;
  // Only set a default type for real <button> elements (not links).
  const resolvedType = Component === 'button' ? type || 'button' : type;
  return (
    <Component
      className={`${BASE} ${sizeClass} ${variantClass} ${className}`}
      {...(resolvedType ? { type: resolvedType } : {})}
      {...rest}
    >
      {children}
    </Component>
  );
}
