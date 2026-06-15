import React from 'react';

/**
 * DataTable — Shopify Polaris IndexTable. One flat white card, edge-to-edge,
 * 8px radius, hairline border, NO shadow. Optional `toolbar` slot renders inside
 * the card top (view-tab + search + display options) with a bottom hairline.
 * Optional `footer` slot (pagination) renders inside the card bottom.
 *
 * Density (Polaris): header 12px/medium/#616161 non-uppercase; body 13px; rows
 * ~40px; cell padding 6px interior, 12px edge; row dividers #ebebeb (border-soft);
 * hover #f7f7f7. Order-number links are dark+medium (NOT blue), underline on hover.
 *
 * Column def: { key, header, render?(row,i), accessor?(row), align?, className?, width? }
 *
 * @param {object} [props.selection] { selectedIds:Set, onToggle:(id)=>void, onToggleAll:(checked,ids)=>void }
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey,
  onRowClick,
  loading = false,
  empty = 'Inga rader.',
  selection,
  toolbar,
  footer,
  className = '',
}) {
  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const allIds = rowKey ? rows.map((r, i) => rowKey(r, i)) : [];
  const allSelected = selection && allIds.length > 0 && allIds.every((id) => selection.selectedIds?.has(id));
  const someSelected = selection && !allSelected && allIds.some((id) => selection.selectedIds?.has(id));

  const lastIdx = columns.length - 1;

  return (
    <div className={`overflow-hidden rounded-[var(--radius-admin)] border border-admin-border bg-admin-surface ${className}`}>
      {toolbar && (
        <div className="flex items-center gap-2 border-b border-admin-border-soft p-2">{toolbar}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[13px] leading-5">
          <thead>
            <tr className="border-b border-admin-border-soft text-left">
              {selection && (
                <th className="w-10 py-2 pl-3 pr-1.5">
                  <input
                    type="checkbox"
                    aria-label="Markera alla"
                    checked={!!allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !!someSelected;
                    }}
                    onChange={(e) => selection.onToggleAll?.(e.target.checked, allIds)}
                    className="h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]"
                  />
                </th>
              )}
              {columns.map((col, ci) => (
                <th
                  key={col.key}
                  className={`py-1.5 text-[12px] font-medium text-admin-text-muted ${
                    ci === 0 && !selection ? 'pl-3' : 'pl-1.5'
                  } ${ci === lastIdx ? 'pr-3' : 'pr-1.5'} ${alignClass(col.align)} ${col.width || ''} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows columns={columns} hasSelection={!!selection} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-3 py-10 text-center text-admin-text-muted">
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
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                              e.preventDefault();
                              onRowClick(row, index);
                            }
                          }
                        : undefined
                    }
                    className={`border-b border-admin-border-soft ${
                      onRowClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-admin-primary)]' : ''
                    } ${isSelected ? 'bg-admin-surface-2' : 'hover:bg-admin-surface-2'} transition-colors`}
                  >
                    {selection && (
                      <td className="w-10 py-2 pl-3 pr-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Markera rad"
                          checked={!!isSelected}
                          onChange={() => selection.onToggle?.(id)}
                          className="h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]"
                        />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={`py-2 align-middle text-admin-text ${
                          ci === 0 && !selection ? 'pl-3' : 'pl-1.5'
                        } ${ci === lastIdx ? 'pr-3' : 'pr-1.5'} ${alignClass(col.align)} ${col.className || ''}`}
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
      {footer && <div className="border-t border-admin-border-soft">{footer}</div>}
    </div>
  );
}

function SkeletonRows({ columns, hasSelection }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, r) => (
        <tr key={r} className="border-b border-admin-border-soft">
          {hasSelection && (
            <td className="py-2.5 pl-3 pr-1.5">
              <div className="h-4 w-4 rounded bg-admin-surface-2" />
            </td>
          )}
          {columns.map((col) => (
            <td key={col.key} className="px-1.5 py-2.5">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-admin-surface-2" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
