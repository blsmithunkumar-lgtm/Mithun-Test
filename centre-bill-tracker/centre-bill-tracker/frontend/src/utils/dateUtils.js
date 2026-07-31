/**
 * Formats an ISO date string ("YYYY-MM-DD") as "28 Jul 2026" for display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Formats a number as Indian Rupees, e.g. 12500 -> "₹12,500.00".
 */
export function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function daysBetween(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Derives display urgency for a bill from its due_date and status.
 * Mirrors the backend's live computation (never stored):
 *   - 'overdue': past due and not yet Paid
 *   - 'dueSoon': due within the next 7 days and not yet Paid
 *   - 'normal': everything else (including anything already Paid)
 */
export function getBillUrgency(bill) {
  if (bill.billStatus === 'Paid') return 'normal';
  const diff = daysBetween(bill.dueDate);
  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'dueSoon';
  return 'normal';
}

/**
 * Converts a "YYYY-MM" value into "Month YYYY" for display, mirroring the
 * server's canonical bill_month label (e.g. "2026-07" -> "July 2026").
 */
export function formatYearMonthToLabel(yearMonth) {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const MONTH_NAME_TO_INDEX = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Reverses formatYearMonthToLabel - converts the stored "Month YYYY" label
 * (e.g. "July 2026") back into "YYYY-MM" so it can pre-fill a native
 * <input type="month"> when editing an existing bill.
 */
export function parseLabelToYearMonth(label) {
  if (!label) return '';
  const [monthName, year] = label.trim().split(' ');
  const monthNum = MONTH_NAME_TO_INDEX[(monthName || '').toLowerCase()];
  if (!monthNum || !year) return '';
  return `${year}-${monthNum}`;
}
