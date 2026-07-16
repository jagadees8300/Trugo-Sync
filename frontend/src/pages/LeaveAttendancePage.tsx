import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { attendanceApi } from '../services/attendanceService';
import type { DailyLeaveAttendance } from '../types';

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const yesterdayYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toYmd(d);
};

/** Previous calendar week's Monday (or today if not Monday - last Monday). */
const lastMondayYmd = () => {
  const d = new Date();
  const day = d.getDay(); // 0 Sun … 1 Mon
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const offset = daysSinceMonday === 0 ? 7 : daysSinceMonday;
  d.setDate(d.getDate() - offset);
  return toYmd(d);
};

const formatLabel = (ymd: string) =>
  new Date(ymd + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

const formatAttendanceTimes = (attendance?: { clockIn: string; clockOut?: string; hours?: number | null } | null) => {
  if (!attendance?.clockIn) return null;
  const inTime = formatTime(attendance.clockIn);
  if (!attendance.clockOut) {
    return `In: ${inTime} · Still working`;
  }
  const outTime = formatTime(attendance.clockOut);
  const hours =
    attendance.hours != null ? ` · ${attendance.hours}h` : '';
  return `In: ${inTime} · Out: ${outTime}${hours}`;
};

const formatRange = (from: string, to: string, days: number) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const same =
    fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getDate() === toDate.getDate();
  if (same) return `${fmt(fromDate)} (${days} Day${days === 1 ? '' : 's'})`;
  return `${fmt(fromDate)} - ${fmt(toDate)} (${days} Day${days === 1 ? '' : 's'})`;
};

const chipStyle = (active: boolean): CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 20,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: active ? 'var(--primary)' : '#f3f4f6',
  color: active ? '#fff' : '#6b7280',
});

const LeaveAttendancePage = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toYmd(new Date()));
  const [data, setData] = useState<DailyLeaveAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (ymd: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceApi.getByDate(ymd);
      setData(res.data as DailyLeaveAttendance);
    } catch {
      setError('Could not load attendance for this date.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const today = toYmd(new Date());
  const yesterday = yesterdayYmd();
  const lastMonday = lastMondayYmd();

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
            onClick={() => navigate('/leave')}
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
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Daily Attendance
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Present vs on leave — pick any day
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button type="button" style={chipStyle(date === today)} onClick={() => setDate(today)}>
            Today
          </button>
          <button
            type="button"
            style={chipStyle(date === yesterday)}
            onClick={() => setDate(yesterday)}
          >
            Yesterday
          </button>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 13,
              }}
            />
          </label>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#111' }}>
          {formatLabel(date)}
        </p>

        {data?.holiday && (
          <div
            className="card"
            style={{
              padding: 14,
              marginBottom: 16,
              background: '#fff7ed',
              border: '1px solid #ffedd5',
            }}
          >
            <strong>Holiday:</strong> {data.holiday.name}
            {data.holiday.optional ? ' (optional)' : ''}
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: 14 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Clocked', value: data?.clockedCount ?? data?.presentCount },
            { label: 'On Leave', value: data?.onLeaveCount },
            { label: 'Absent', value: data?.absentCount },
            { label: 'Total', value: data?.totalEmployees },
          ].map((c) => (
            <div
              key={c.label}
              className="card"
              style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}
            >
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                {c.label.toUpperCase()}
              </p>
              <h2 style={{ margin: 0 }}>{loading ? '--' : String(c.value ?? 0).padStart(2, '0')}</h2>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px' }}>Clocked In / Out</h4>
            {loading ? (
              <p className="text-muted" style={{ margin: 0 }}>
                Loading...
              </p>
            ) : !data || data.present.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>
                No one clocked in.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {data.present.map((p) => {
                  const times = formatAttendanceTimes(p.attendance);
                  return (
                    <li
                      key={p.employeeId}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{p.employeeName}</span>
                        {p.designation && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {p.designation}
                          </span>
                        )}
                      </div>
                      {times && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {times}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px' }}>Absent (no clock-in)</h4>
            {loading ? (
              <p className="text-muted" style={{ margin: 0 }}>Loading...</p>
            ) : !data?.absent?.length ? (
              <p className="text-muted" style={{ margin: 0 }}>None</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {data.absent.map((p) => (
                  <li
                    key={p.employeeId}
                    style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}
                  >
                    <span style={{ fontWeight: 500 }}>{p.employeeName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px' }}>On Leave</h4>
            {loading ? (
              <p className="text-muted" style={{ margin: 0 }}>
                Loading...
              </p>
            ) : !data || data.onLeave.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>
                No one on leave.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {data.onLeave.map((p) => (
                  <li
                    key={p.employeeId}
                    style={{
                      padding: '10px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{p.employeeName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatRange(p.fromDate, p.toDate, p.totalDays)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveAttendancePage;
