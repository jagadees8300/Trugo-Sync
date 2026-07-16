import { Video } from 'lucide-react';
import { DAILY_MEETING_LABEL, DAILY_MEETING_URL } from '../constants/meeting';

const DailyMeetingCard = () => (
  <a
    href={DAILY_MEETING_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="card daily-meeting-card"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '16px 20px',
      marginBottom: 24,
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid #fed7aa',
      background: 'linear-gradient(135deg, #fff9f0 0%, #ffffff 100%)',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Video size={22} color="#fff" />
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111827' }}>
          {DAILY_MEETING_LABEL}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Join the team Google Meet — admin and employees
        </p>
      </div>
    </div>
    <span
      className="btn btn-primary"
      style={{
        width: 'auto',
        padding: '10px 18px',
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      Join Meeting
    </span>
  </a>
);

export default DailyMeetingCard;
