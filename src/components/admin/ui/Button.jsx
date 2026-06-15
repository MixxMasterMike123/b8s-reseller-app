import React from 'react';

/**
 * Button — Admin Neutral button primitive.
 *
 * Variants follow Shopify's admin grammar:
 *   - primary     filled with the per-shop accent (--color-admin-primary). The
 *                 ONLY place the accent appears as a fill (design discipline).
 *   - secondary   neutral surface + hairline border (the default action button)
 *   - plain       text-only, for low-emphasis / inline actions
 *   - destructive red, for delete/cancel
 *
 * Renders <button> by default, or <a>/Link when `as` is provided, so it can be
 * used for navigation without losing the styling. Forwards all extra props.
 */

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-[var(--radius-admin-el)] ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'focus-visible:ring-offset-[var(--color-admin-bg)] focus-visible:ring-[var(--color-admin-primary)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-4 py-2.5 text-sm',
};

const VARIANTS = {
  primary:
    'text-white bg-[var(--color-admin-primary)] hover:brightness-110 active:brightness-95 shadow-[var(--shadow-admin)]',
  secondary:
    'text-admin-text bg-admin-surface border border-admin-border hover:bg-admin-surface-2 shadow-[var(--shadow-admin)]',
  plain:
    'text-admin-text-muted hover:text-admin-text hover:bg-admin-surface-2',
  destructive:
    'text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-[var(--shadow-admin)]',
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
