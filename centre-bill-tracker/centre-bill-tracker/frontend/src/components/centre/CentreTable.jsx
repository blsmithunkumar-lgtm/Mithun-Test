import Badge from '../common/Badge';

export default function CentreTable({ centres, isAdmin, onEdit, onToggleStatus, onDelete }) {
  if (centres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="font-display text-sm font-medium text-ink-900">No centres found</p>
        <p className="text-sm text-ink-500">Try adjusting your search, or add a new centre to get started.</p>
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
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">WiFi ID</th>
              <th className="px-4 py-3 font-medium">Account Number</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {centres.map((centre) => (
              <tr key={centre.id} className="hover:bg-surface-muted/60">
                <td className="px-4 py-3 font-medium text-ink-900">{centre.centreName}</td>
                <td className="px-4 py-3 text-ink-500">{centre.vendorName || '—'}</td>
                <td className="px-4 py-3 text-ink-500">{centre.wifiId || '—'}</td>
                <td className="px-4 py-3 text-ink-500">{centre.accountNumber || '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={centre.status === 'Active' ? 'active' : 'inactive'} dot>
                    {centre.status}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(centre)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-brand-500 hover:bg-brand-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggleStatus(centre)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-surface-muted"
                      >
                        {centre.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => onDelete(centre)}
                        disabled={centre.billCount > 0}
                        title={centre.billCount > 0 ? 'Cannot delete: bills are linked to this centre' : 'Delete centre'}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-status-overdue hover:bg-status-overdueBg disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
