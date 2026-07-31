const TONE_CLASSES = {
  neutral: 'bg-surface-muted text-ink-500 border-surface-border',
  pending: 'bg-status-pendingBg text-status-pending border-status-pending/20',
  received: 'bg-status-receivedBg text-status-received border-status-received/20',
  paid: 'bg-status-paidBg text-status-paid border-status-paid/20',
  dueSoon: 'bg-status-dueSoonBg text-status-dueSoon border-status-dueSoon/20',
  overdue: 'bg-status-overdueBg text-status-overdue border-status-overdue/20',
  active: 'bg-status-paidBg text-status-paid border-status-paid/20',
  inactive: 'bg-surface-muted text-ink-500 border-surface-border',
};

export default function Badge({ tone = 'neutral', children, dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
