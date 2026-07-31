import { forwardRef } from 'react';

/**
 * Wraps the native <input type="month"> so users pick a month/year instead
 * of typing free text - this is what guarantees bill_month is always stored
 * in a consistent format server-side (see billMonth.util.js on the backend).
 */
const MonthYearPicker = forwardRef(function MonthYearPicker(
  { label = 'Bill Month', error, id = 'billMonth', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        type="month"
        id={id}
        ref={ref}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 transition-colors ${
          error ? 'border-status-overdue' : 'border-surface-border'
        }`}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="text-xs text-status-overdue">{error}</p>}
    </div>
  );
});

export default MonthYearPicker;
