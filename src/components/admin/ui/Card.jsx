import React from 'react';

/**
 * Card / CardSection — Admin Neutral surface primitives.
 *
 * Card is the calm white (dark: surface) panel with a hairline border and the
 * flat admin shadow. CardSection adds an optional header row (title + actions)
 * and consistent padding. Right-rail metadata blocks are just stacked Cards.
 */

export function Card({ className = '', padded = false, children, ...rest }) {
  return (
    <div
      className={`bg-admin-surface border border-admin-border rounded-[var(--radius-admin)] shadow-[var(--shadow-admin)] ${
        padded ? 'p-4' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * CardSection — a titled block inside a Card layout. Use standalone (it renders
 * its own Card) or compose multiple.
 *
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.actions]  right-aligned header actions
 * @param {boolean} [props.bare]  drop the outer Card (for nesting inside one)
 */
export function CardSection({ title, actions, bare = false, className = '', bodyClassName = '', children }) {
  const header = (title || actions) && (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-admin-border">
      {title && <h3 className="text-sm font-semibold text-admin-text">{title}</h3>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
  const body = (
    <>
      {header}
      <div className={`px-4 py-4 ${bodyClassName}`}>{children}</div>
    </>
  );
  if (bare) return <div className={className}>{body}</div>;
  return <Card className={className}>{body}</Card>;
}

export default Card;
