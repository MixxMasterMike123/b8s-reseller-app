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
