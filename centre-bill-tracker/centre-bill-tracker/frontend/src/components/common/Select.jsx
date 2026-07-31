import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { label, error, id, children, className = '', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 transition-colors ${
          error ? 'border-status-overdue' : 'border-surface-border'
        } ${className}`}
        aria-invalid={!!error}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-status-overdue">{error}</p>}
    </div>
  );
});

export default Select;
