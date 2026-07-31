const TONE_STYLES = {
  neutral: { bar: 'bg-brand-500', iconBg: 'bg-brand-50', iconText: 'text-brand-500' },
  received: { bar: 'bg-status-received', iconBg: 'bg-status-receivedBg', iconText: 'text-status-received' },
  pending: { bar: 'bg-status-pending', iconBg: 'bg-status-pendingBg', iconText: 'text-status-pending' },
  dueSoon: { bar: 'bg-status-dueSoon', iconBg: 'bg-status-dueSoonBg', iconText: 'text-status-dueSoon' },
  overdue: { bar: 'bg-status-overdue', iconBg: 'bg-status-overdueBg', iconText: 'text-status-overdue' },
};

export default function SummaryCard({ label, value, tone = 'neutral', icon, isLoading }) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border border-surface-border bg-white p-5 shadow-card">
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-surface-muted" />
          ) : (
            <p className="mt-1 font-display text-3xl font-semibold text-ink-900">{value}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
