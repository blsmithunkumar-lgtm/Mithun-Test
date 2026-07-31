const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Converts a "YYYY-MM" value (as sent by an <input type="month"> picker)
 * into the canonical storage format used in bills.bill_month, e.g.
 * "2026-07" -> "July 2026".
 *
 * Normalizing on the server (not just the client) guarantees the uniqueness
 * rule (one bill per centre per bill_month) can never be bypassed by
 * inconsistent formatting from a client, script, or future integration.
 *
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {string} e.g. "July 2026"
 */
function toBillMonthLabel(yearMonth) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth || '');
  if (!match) {
    throw new Error(`Invalid year-month value: "${yearMonth}". Expected format YYYY-MM.`);
  }
  const [, year, month] = match;
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month in value: "${yearMonth}".`);
  }
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

module.exports = { toBillMonthLabel, MONTH_NAMES };
