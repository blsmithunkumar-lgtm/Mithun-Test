import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, id, className = '', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 transition-colors ${
          error ? 'border-status-overdue' : 'border-surface-border'
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-status-overdue">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
});

export default Input;
