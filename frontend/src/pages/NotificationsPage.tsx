import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { notificationsApi } from '../services/api';
import { getHomePathForRole, getUserRole, isAdmin } from '../utils/task';
import type { Notification } from '../types';

const typeLabel = (type: Notification['type']) => {
  switch (type) {
    case 'TASK_ASSIGNED':
      return 'Task assigned';
    case 'COMMENT_ADDED':
      return 'New comment';
    case 'OVERDUE':
      return 'Overdue';
    case 'LEAVE_SUBMITTED':
      return 'Leave request';
    default:
      return type;
  }
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const homePath = getHomePathForRole(getUserRole());
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.getMine();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Could not load notifications.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onOpen = async (n: Notification) => {
    if (!n.readStatus) {
      try {
        await notificationsApi.markRead(n._id);
        setItems((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, readStatus: true } : x)),
        );
      } catch {
        /* keep unread in UI */
      }
    }
  };

  return (
    <>
      <BottomNav />
      <div className="content page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(homePath)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <ArrowLeft size={22} color="#333" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Notifications
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {isAdmin()
                ? 'From / To, date and time for admin notifications.'
                : 'Shows who assigned the task to you (From).'}
            </p>
          </div>
        </div>

        {loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
        )}

        {!loading && error && (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: 14 }}>{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <Bell size={28} color="#f97316" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              No notifications yet
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((n) => {
              const senderName = n.sender?.name?.trim() || 'Unknown';
              const toName = n.targetUser?.name?.trim();
              const showTo = isAdmin() && !!toName;
              return (
                <button
                  key={n._id}
                  type="button"
                  className="card"
                  onClick={() => void onOpen(n)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 16,
                    border: n.readStatus ? '1px solid #f3f4f6' : '1px solid #fdba74',
                    background: n.readStatus ? '#fff' : '#fff7ed',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#f97316',
                      }}
                    >
                      {typeLabel(n.type)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 15,
                      lineHeight: 1.45,
                      color: '#111',
                      fontWeight: n.readStatus ? 400 : 600,
                    }}
                  >
                    {n.message}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 16px',
                      fontSize: 13,
                      color: '#4b5563',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      From:{' '}
                      <strong style={{ color: '#111' }}>{senderName}</strong>
                    </span>
                    {showTo && (
                      <span>
                        To:{' '}
                        <strong style={{ color: '#111' }}>{toName}</strong>
                      </span>
                    )}
                    {!n.readStatus && (
                      <span
                        style={{
                          color: '#ea580c',
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        Unread
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
