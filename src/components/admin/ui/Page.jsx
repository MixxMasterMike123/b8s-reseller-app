import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Page — the Admin Neutral page frame.
 *
 * Gives every admin page one consistent header grammar: optional back-link,
 * title (+ optional subtitle / inline status pills), and a right-aligned action
 * cluster (primary + secondary buttons). Wraps content in a max-width,
 * consistently padded container against the admin canvas.
 *
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.titleAdornment]  e.g. status pills next to title
 * @param {React.ReactNode} [props.actions]  right-aligned header actions
 * @param {{to:string,label:string}} [props.back]  back link
 * @param {'default'|'wide'|'full'} [props.width='default']
 */
const WIDTHS = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
};

export default function Page({
  title,
  subtitle,
  titleAdornment,
  actions,
  back,
  width = 'default',
  className = '',
  children,
}) {
  return (
    <div className="min-h-full bg-admin-bg">
      <div className={`mx-auto w-full ${WIDTHS[width] || WIDTHS.default} px-4 py-6 sm:px-6 lg:px-8`}>
        {(title || actions || back) && (
          <header className="mb-6">
            {back && (
              <Link
                to={back.to}
                className="inline-flex items-center gap-1 text-sm text-admin-text-muted hover:text-admin-text mb-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {back.label}
              </Link>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h1 className="text-xl font-semibold text-admin-text truncate">{title}</h1>
                  )}
                  {titleAdornment}
                </div>
                {subtitle && <p className="mt-0.5 text-sm text-admin-text-muted">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
          </header>
        )}
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
