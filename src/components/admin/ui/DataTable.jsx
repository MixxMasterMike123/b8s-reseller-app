import React from 'react';
import { Card } from './Card';

/**
 * DataTable — the calm Admin Neutral table that replaces the bespoke <table>s
 * in AdminOrders / AdminProducts / etc.
 *
 * Column def: {
 *   key:        string,                       // unique
 *   header:     ReactNode,                    // column title
 *   render:     (row, index) => ReactNode,    // cell content (preferred)
 *   accessor?:  (row) => ReactNode,           // simple value (used if no render)
 *   align?:     'left'|'right'|'center',
 *   className?: string,                        // applied to <td> (+ <th>)
 *   width?:     string,                        // e.g. 'w-32'
 * }
 *
 * Behavior is owned by the caller: pass sorted/filtered `rows`. The table only
 * renders. Selection is optional and controlled (selectedIds Set + onToggle*),
 * so existing bulk-action logic can be wired without changing its semantics.
 *
 * @param {object} props
 * @param {Array} props.columns
 * @param {Array} props.rows
 * @param {(row,index)=>string|number} props.rowKey  stable key per row
 * @param {(row,index)=>void} [props.onRowClick]
 * @param {boolean} [props.loading]
 * @param {React.ReactNode} [props.empty]  empty-state content
 * @param {object} [props.selection]  { selectedIds:Set, onToggle:(id)=>void, onToggleAll:(checked,ids)=>void }
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey,
  onRowClick,
  loading = false,
  empty = 'Inga rader.',
  selection,
  className = '',
}) {
  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const allIds = rowKey ? rows.map((r, i) => rowKey(r, i)) : [];
  const allSelected =
    selection && allIds.length > 0 && allIds.every((id) => selection.selectedIds?.has(id));
  const someSelected =
    selection && !allSelected && allIds.some((id) => selection.selectedIds?.has(id));

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px] leading-5">
          <thead>
            {/* Polaris IndexTable header: 12px / medium / #616161, NOT uppercase. */}
            <tr className="border-b border-admin-border bg-admin-surface text-left">
              {selection && (
                <th className="w-10 pl-3 pr-1.5 py-2">
                  <input
                    type="checkbox"
                    aria-label="Markera alla"
                    checked={!!allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !!someSelected;
                    }}
                    onChange={(e) => selection.onToggleAll?.(e.target.checked, allIds)}
                    className="h-4 w-4 rounded border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]"
                  />
                </th>
              )}
              {columns.map((col, ci) => (
                <th
                  key={col.key}
                  className={`px-1.5 py-2 text-[12px] font-medium text-admin-text-muted ${
                    ci === 0 && !selection ? 'pl-3' : ''
                  } ${ci === columns.length - 1 ? 'pr-3' : ''} ${alignClass(
                    col.align
                  )} ${col.width || ''} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border-soft">
            {loading ? (
              <SkeletonRows columns={columns} hasSelection={!!selection} />
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="px-3 py-10 text-center text-admin-text-muted"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const id = rowKey ? rowKey(row, index) : index;
                const isSelected = selection?.selectedIds?.has(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    // Keyboard affordance: when the row is clickable, make it
                    // focusable + Enter/Space activatable. Guard on target ===
                    // currentTarget so a keypress inside an interactive cell
                    // (e.g. the status menu) doesn't also trigger row activation.
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (
                              (e.key === 'Enter' || e.key === ' ') &&
                              e.target === e.currentTarget
                            ) {
                              e.preventDefault();
                              onRowClick(row, index);
                            }
                          }
                        : undefined
                    }
                    className={`${onRowClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-admin-primary)]' : ''} ${
                      isSelected ? 'bg-admin-surface-2' : 'hover:bg-admin-surface-2'
                    } transition-colors`}
                  >
                    {selection && (
                      <td className="w-10 pl-3 pr-1.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Markera rad"
                          checked={!!isSelected}
                          onChange={() => selection.onToggle?.(id)}
                          className="h-4 w-4 rounded border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]"
                        />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={`px-1.5 py-2.5 text-admin-text align-middle ${
                          ci === 0 && !selection ? 'pl-3' : ''
                        } ${ci === columns.length - 1 ? 'pr-3' : ''} ${alignClass(col.align)} ${
                          col.className || ''
                        }`}
                      >
                        {col.render ? col.render(row, index) : col.accessor ? col.accessor(row) : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SkeletonRows({ columns, hasSelection }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, r) => (
        <tr key={r}>
          {hasSelection && (
            <td className="px-3 py-3">
              <div className="h-4 w-4 rounded bg-admin-surface-2" />
            </td>
          )}
          {columns.map((col) => (
            <td key={col.key} className="px-3 py-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-admin-surface-2" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
