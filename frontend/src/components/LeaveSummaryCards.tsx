import type { LeaveDashboard, MyLeaveSummary } from '../types';

interface LeaveSummaryCardsProps {
  stats: LeaveDashboard | MyLeaveSummary;
  loading?: boolean;
  variant?: 'org' | 'personal';
}

const orgCards: { key: keyof LeaveDashboard; label: string }[] = [
  { key: 'present', label: 'Present Today' },
  { key: 'absent', label: 'Absent Today' },
  { key: 'onLeave', label: 'On Leave Today' },
  { key: 'pending', label: 'Pending Requests' },
];

const personalCards: { key: keyof MyLeaveSummary; label: string }[] = [
  { key: 'totalLeaveDays', label: 'Total Leave Days' },
  { key: 'approvedCount', label: 'Approved Requests' },
  { key: 'pendingCount', label: 'Pending Requests' },
];

const LeaveSummaryCards = ({ stats, loading, variant = 'org' }: LeaveSummaryCardsProps) => {
  const cards = variant === 'personal' ? personalCards : orgCards;

  const getValue = (key: string) => {
    if (variant === 'personal') {
      return (stats as MyLeaveSummary)[key as keyof MyLeaveSummary] as number;
    }
    return (stats as LeaveDashboard)[key as keyof LeaveDashboard];
  };

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <div
          key={card.key}
          className="card"
          style={{ flex: '1 1 140px', textAlign: 'center', padding: 16 }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
            {card.label.toUpperCase()}
          </p>
          <h2 style={{ margin: 0 }}>
            {loading ? '--' : (getValue(card.key) ?? 0)}
          </h2>
        </div>
      ))}
    </div>
  );
};

export default LeaveSummaryCards;
