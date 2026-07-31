import StatusBadge from '../bill/StatusBadge';
import { formatDate, getBillUrgency } from '../../utils/dateUtils';

const URGENCY_BORDER = {
  overdue: 'border-l-status-overdue',
  dueSoon: 'border-l-status-dueSoon',
  normal: 'border-l-transparent',
};

export default function LatestBillsTable({ bills, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-10 w-full animate-pulse rounded bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-white py-12 text-center">
        <p className="font-display text-sm font-medium text-ink-900">No bills yet</p>
        <p className="text-sm text-ink-500">Bills you add will show up here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-muted text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Centre Name</th>
              <th className="px-4 py-3 font-medium">Bill Month</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {bills.map((bill) => {
              const urgency = getBillUrgency(bill);
              return (
                <tr key={bill.id} className={`border-l-4 ${URGENCY_BORDER[urgency]}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{bill.centreName}</td>
                  <td className="px-4 py-3 text-ink-500">{bill.billMonth}</td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(bill.dueDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={bill.billStatus} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
