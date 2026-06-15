import React from 'react';

/**
 * Field + inputs — Admin Neutral form primitives.
 *
 * Field is the label + control + help/error wrapper. Input / Textarea / Select
 * are neutral controls styled to the admin tokens with a consistent focus ring
 * (accent). These are layout/style primitives only — state is the caller's.
 */

const CONTROL =
  'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface ' +
  'px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export function Field({ label, htmlFor, help, error, required, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-admin-text">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : help ? (
        <p className="mt-1 text-xs text-admin-text-muted">{help}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`${CONTROL} ${className}`} {...rest} />;
});

export const Textarea = React.forwardRef(function Textarea({ className = '', rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={`${CONTROL} ${className}`} {...rest} />;
});

export const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={`${CONTROL} pr-8 ${className}`} {...rest}>
      {children}
    </select>
  );
});

export default Field;
