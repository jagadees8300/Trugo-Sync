import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { connectRealtime } from '../services/realtime';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState('');

  const loadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch (err) {
      console.error('Failed to load notification count', err);
    }
  };

  useEffect(() => {
    void loadCount();
    const timer = window.setInterval(() => void loadCount(), 60_000);

    connectRealtime((payload) => {
      setUnreadCount((c) => c + 1);
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: string }).message)
          : 'New notification';
      setToast(message);
      window.setTimeout(() => setToast(''), 3500);
    });

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => navigate('/notifications')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          position: 'relative',
        }}
      >
        <Bell size={22} color="#666" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#dc2626',
              color: '#fff',
              fontSize: 10,
              borderRadius: 8,
              padding: '1px 5px',
              fontWeight: 700,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            zIndex: 50,
            minWidth: 220,
            maxWidth: 280,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#111827',
            color: '#fff',
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
