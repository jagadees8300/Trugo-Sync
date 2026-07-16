import { useEffect, useState } from 'react';
import { attendanceApi, type AttendanceEntry } from '../services/attendanceService';

const ClockCard = () => {
  const [today, setToday] = useState<AttendanceEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getToday();
      setToday(res.data);
      setError('');
    } catch {
      setToday(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clockIn = async () => {
    setBusy(true);
    try {
      const res = await attendanceApi.clockIn();
      setToday(res.data);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Clock-in failed';
      setError(typeof message === 'string' ? message : 'Clock-in failed');
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    try {
      const res = await attendanceApi.clockOut();
      setToday(res.data);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Clock-out failed';
      setError(typeof message === 'string' ? message : 'Clock-out failed');
    } finally {
      setBusy(false);
    }
  };

  const canClockIn = !today;
  const canClockOut = Boolean(today && !today.clockOut);

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h4 style={{ margin: 0 }}>Time & Attendance</h4>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {loading
              ? 'Loading...'
              : today
                ? `In: ${new Date(today.clockIn).toLocaleTimeString()}${
                    today.clockOut
                      ? ` · Out: ${new Date(today.clockOut).toLocaleTimeString()}${
                          today.hours != null ? ` · ${today.hours}h` : ''
                        }`
                      : ' · Still working'
                  }`
                : 'Not clocked in yet today'}
          </p>
          {error && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b91c1c' }}>{error}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !canClockIn}
            onClick={() => void clockIn()}
          >
            Clock In
          </button>
          <button
            type="button"
            className="btn"
            style={{
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              background: '#fff',
            }}
            disabled={busy || !canClockOut}
            onClick={() => void clockOut()}
          >
            Clock Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClockCard;
