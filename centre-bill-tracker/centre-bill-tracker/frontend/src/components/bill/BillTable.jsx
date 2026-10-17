import StatusBadge from './StatusBadge';
import Button from '../common/Button';
import { formatDate, formatAmount, getBillUrgency } from '../../utils/dateUtils';

const URGENCY_BORDER = {
  overdue: 'border-l-status-overdue',
  dueSoon: 'border-l-status-dueSoon',
  normal: 'border-l-transparent',
};

export default function BillTable({ bills, isAdmin, onEdit, onAdvanceStatus, onFinance }) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="font-display text-sm font-medium text-ink-900">No bills found</p>
        <p className="text-sm text-ink-500">Try adjusting your search or filters, or add a new bill.</p>
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
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {bills.map((bill) => {
              const urgency = getBillUrgency(bill);
              return (
                <tr key={bill.id} className={`border-l-4 hover:bg-surface-muted/60 ${URGENCY_BORDER[urgency]}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{bill.centreName}</td>
                  <td className="px-4 py-3 text-ink-500">{bill.billMonth}</td>
                  <td className="px-4 py-3 text-ink-500">{bill.invoiceNumber}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {formatDate(bill.dueDate)}
                    {urgency === 'overdue' && <span className="ml-2 text-xs font-medium text-status-overdue">Overdue</span>}
                    {urgency === 'dueSoon' && <span className="ml-2 text-xs font-medium text-status-dueSoon">Due soon</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-900">{formatAmount(bill.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={bill.billStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button onClick={() => onFinance(bill)} className="rounded-lg px-2 py-1 text-xs font-medium text-brand-500 hover:bg-brand-50">
                        Finance
                      </button>
                      {isAdmin && (
                        <button onClick={() => onEdit(bill)} className="rounded-lg px-2 py-1 text-xs font-medium text-brand-500 hover:bg-brand-50">
                          Edit
                        </button>
                      )}
                      {bill.billStatus === 'Pending' && (
                        <Button size="sm" variant="secondary" onClick={() => onAdvanceStatus(bill, 'Received')}>
                          Mark Received
                        </Button>
                      )}
                      {bill.billStatus === 'Received' && isAdmin && (
                        <Button size="sm" variant="primary" onClick={() => onAdvanceStatus(bill, 'Paid')}>
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
