const VARIANTS = {
  error: 'bg-status-overdueBg text-status-overdue border-status-overdue/20',
  success: 'bg-status-paidBg text-status-paid border-status-paid/20',
  warning: 'bg-status-dueSoonBg text-status-dueSoon border-status-dueSoon/20',
  info: 'bg-status-receivedBg text-status-received border-status-received/20',
};

export default function Alert({ variant = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${VARIANTS[variant]}`} role="alert">
      {children}
    </div>
  );
}
