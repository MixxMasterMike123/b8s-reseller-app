import React from 'react';

/**
 * FilterBar + SegmentedTabs — Admin Neutral list controls.
 *
 * FilterBar is the row above a DataTable: an optional search input, optional
 * segmented filter groups (the "All / source / status" tab rows), and a trailing
 * slot for extra controls (column toggle, view switch). Layout-only — it owns no
 * filtering logic; callers wire value/onChange so existing filter behavior is
 * preserved exactly.
 */

export function SegmentedTabs({ options = [], value, onChange, ariaLabel, className = '' }) {
  // Semantics: a single-select segmented FILTER, not a tab strip. We use
  // radiogroup/radio (not tablist/tab) — tab roles imply an associated tabpanel
  // + arrow-key roving we don't provide, which misleads screen readers.
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-admin-surface text-admin-text shadow-[var(--shadow-admin)]'
                : 'text-admin-text-muted hover:text-admin-text'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && opt.count !== null && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  active ? 'bg-admin-bg text-admin-text-muted' : 'bg-admin-surface-2 text-admin-text-faint'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Sök…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-faint"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface py-1.5 pl-9 pr-3 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
      />
    </div>
  );
}

export default function FilterBar({ search, tabs, trailing, className = '', children }) {
  return (
    <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {search}
        {tabs}
        {children}
      </div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   In-card table toolbar pieces (Polaris IndexTable header). These live INSIDE
   the DataTable `toolbar` slot, not above the card.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * ViewTabs — the "All ⌄ / Återförsäljare / Kunder" view selector that sits at the
 * far left of the table toolbar. Subtle filled active state (Polaris view tabs).
 */
export function ViewTabs({ options = [], value, onChange, ariaLabel, className = '' }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`flex items-center gap-1 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(opt.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-admin-el)] px-3 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-black/[0.06] text-admin-text dark:bg-white/10'
                : 'text-admin-text-muted hover:bg-black/[0.04] hover:text-admin-text dark:hover:bg-white/5'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && opt.count !== null && (
              <span className="rounded-full bg-admin-surface px-1.5 text-[11px] text-admin-text-faint shadow-[var(--shadow-admin)]">
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * InlineSearch — the flex-1 search field inside the table toolbar. Reads like a
 * contenteditable row (leading icon + muted placeholder), not a boxed input.
 */
export function InlineSearch({ value, onChange, placeholder = 'Sök och filtrera', className = '' }) {
  return (
    <div className={`flex h-8 flex-1 items-center gap-2 rounded-[var(--radius-admin-el)] px-2.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 ${className}`}>
      <svg className="h-4 w-4 shrink-0 text-admin-text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-admin-text placeholder:text-admin-text-muted focus:outline-none"
      />
    </div>
  );
}

/**
 * Pagination — centered prev/next segmented chevrons + a range label. Layout-only.
 */
export function Pagination({ label, onPrev, onNext, prevDisabled, nextDisabled, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-3 ${className}`}>
      <div className="inline-flex overflow-hidden rounded-[var(--radius-admin-el)] border border-admin-border shadow-[var(--shadow-admin)]">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="Föregående"
          className="grid h-7 w-8 place-items-center bg-admin-surface text-admin-text-muted hover:bg-admin-surface-2 disabled:opacity-40 disabled:hover:bg-admin-surface"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.7 5.3a1 1 0 010 1.4L9.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="w-px bg-admin-border" />
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Nästa"
          className="grid h-7 w-8 place-items-center bg-admin-surface text-admin-text-muted hover:bg-admin-surface-2 disabled:opacity-40 disabled:hover:bg-admin-surface"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M7.3 14.7a1 1 0 010-1.4L10.6 10 7.3 6.7a1 1 0 011.4-1.4l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {label && <span className="text-[13px] tabular-nums text-admin-text-muted">{label}</span>}
    </div>
  );
}
