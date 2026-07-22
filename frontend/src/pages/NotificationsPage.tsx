import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Trash2 } from 'lucide-react';
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
    case 'LEAVE_APPROVED':
      return 'Leave approved';
    case 'LEAVE_REJECTED':
      return 'Leave rejected';
    case 'DOCUMENT_UPLOADED':
      return 'Document uploaded';
    case 'WORK_FROM_HOME':
      return 'Work from home';
    case 'ATTENDANCE_PAUSED':
      return 'Attendance paused';
    case 'ATTENDANCE_RESUMED':
      return 'Attendance resumed';
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
  const admin = isAdmin();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.getMine();
      setItems(Array.isArray(res.data) ? res.data : []);
      setSelected(new Set());
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

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((n) => n._id)));
  };

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

  const handleDeleteOne = async (id: string) => {
    const ok = window.confirm('Delete this notification?');
    if (!ok) return;
    setDeletingId(id);
    try {
      await notificationsApi.delete(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete notification', err);
      alert('Failed to delete notification.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} selected notification${ids.length === 1 ? '' : 's'}?`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await notificationsApi.bulkDelete(ids);
      setItems((prev) => prev.filter((n) => !selected.has(n._id)));
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to delete notifications', err);
      alert('Failed to delete selected notifications.');
    } finally {
      setDeleting(false);
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
            flexWrap: 'wrap',
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
          <div style={{ flex: 1, minWidth: 160 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Notifications
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {admin
                ? 'Select and delete messages, or delete one at a time.'
                : 'Select and delete your notification messages.'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              className="btn"
              disabled={selected.size === 0 || deleting}
              onClick={() => void handleDeleteSelected()}
              style={{
                width: 'auto',
                padding: '8px 14px',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #fecaca',
                color: selected.size === 0 ? '#9ca3af' : '#b91c1c',
                background: selected.size === 0 ? '#f9fafb' : '#fef2f2',
              }}
            >
              <Trash2 size={15} />
              {deleting ? 'Deleting…' : `Delete selected (${selected.size})`}
            </button>
          )}
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
          <>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontSize: 13,
                color: '#374151',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              Select all
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((n) => {
                const senderName = n.sender?.name?.trim() || 'Unknown';
                const toName = n.targetUser?.name?.trim();
                const showTo = admin && !!toName;
                const isChecked = selected.has(n._id);
                const busy = deletingId === n._id;

                return (
                  <div
                    key={n._id}
                    className="card"
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: 16,
                      border: n.readStatus ? '1px solid #f3f4f6' : '1px solid #fdba74',
                      background: n.readStatus ? '#fff' : '#fff7ed',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(n._id)}
                      aria-label={`Select notification ${n._id}`}
                      style={{ marginTop: 4, flexShrink: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => void onOpen(n)}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
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
                    <button
                      type="button"
                      aria-label="Delete notification"
                      disabled={busy || deleting}
                      onClick={() => void handleDeleteOne(n._id)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        borderRadius: 8,
                        padding: 8,
                        cursor: busy ? 'wait' : 'pointer',
                        display: 'flex',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
