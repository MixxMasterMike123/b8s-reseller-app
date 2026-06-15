import React from 'react';

/**
 * Toolbar — a thin horizontal cluster for grouped actions (e.g. export / print
 * buttons above a table, or a bulk-action bar that appears when rows are
 * selected). Layout-only.
 *
 * When `count` is provided it renders a left-side "{count} markerade" summary,
 * for the selection bulk-action pattern.
 */
export default function Toolbar({ count, children, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        count !== undefined ? 'justify-between' : 'justify-end'
      } ${className}`}
    >
      {count !== undefined && (
        <span className="text-sm text-admin-text-muted">
          {count} markerade
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
