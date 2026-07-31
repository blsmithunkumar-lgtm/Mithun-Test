import Badge from '../common/Badge';

const STATUS_TONE = {
  Pending: 'pending',
  Received: 'received',
  Paid: 'paid',
};

export default function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} dot>
      {status}
    </Badge>
  );
}
