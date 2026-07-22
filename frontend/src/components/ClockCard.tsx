import { useEffect, useState } from 'react';
import {
  attendanceApi,
  type AttendanceEntry,
  type LocationCheckResult,
} from '../services/attendanceService';
import { getCurrentPosition } from '../utils/geolocation';

const btnRowStyle = {
  width: 'auto' as const,
  flex: 1,
  whiteSpace: 'nowrap' as const,
  padding: '10px 8px',
  fontSize: 13,
};

const ClockCard = () => {
  const [today, setToday] = useState<AttendanceEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [locationStatus, setLocationStatus] = useState<LocationCheckResult | null>(null);

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

  const verifyLocation = async () => {
    const coords = await getCurrentPosition();
    const res = await attendanceApi.checkLocation(coords.latitude, coords.longitude);
    setLocationStatus(res.data);
    return { coords, check: res.data };
  };

  const clockIn = async () => {
    setBusy(true);
    setError('');
    setLocationStatus(null);
    try {
      const { coords, check } = await verifyLocation();
      if (!check.allowed) {
        setError(check.message);
        return;
      }
      const res = await attendanceApi.clockIn(coords.latitude, coords.longitude);
      setToday(res.data);
      setLocationStatus(check);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      const message =
        typeof apiMessage === 'string'
          ? apiMessage
          : err instanceof Error
            ? err.message
            : 'Clock-in failed';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const workFromHome = async () => {
    setBusy(true);
    setError('');
    setLocationStatus(null);
    try {
      const res = await attendanceApi.workFromHome();
      setToday(res.data);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      const message =
        typeof apiMessage === 'string'
          ? apiMessage
          : err instanceof Error
            ? err.message
            : 'Work from home failed';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const pause = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await attendanceApi.pause(pauseReason.trim() || undefined);
      setToday(res.data);
      setPauseReason('');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Pause failed');
    } finally {
      setBusy(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await attendanceApi.resume();
      setToday(res.data);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Resume failed');
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
      setPauseReason('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Clock-out failed';
      setError(typeof message === 'string' ? message : 'Clock-out failed');
    } finally {
      setBusy(false);
    }
  };

  const isPaused = today?.status === 'PAUSED';
  const isWorking = today?.status === 'WORKING';
  const canClockIn = !today;
  const canClockOut = Boolean(today && !today.clockOut);
  const canPause = Boolean(today && !today.clockOut && isWorking);
  const canResume = Boolean(today && !today.clockOut && isPaused);

  const statusText = () => {
    if (loading) return 'Loading...';
    if (!today) return 'Not clocked in yet today · Clock In (office GPS) or Work From Home';
    const mode = today.workMode === 'WFH' ? 'WFH · ' : '';
    const inTime = new Date(today.clockIn).toLocaleTimeString();
    if (today.clockOut) {
      const outTime = new Date(today.clockOut).toLocaleTimeString();
      const hours = today.hours != null ? ` · ${today.hours}h` : '';
      return `${mode}In: ${inTime} · Out: ${outTime}${hours}`;
    }
    if (isPaused) {
      const reason = today.activePauseReason ? ` (${today.activePauseReason})` : '';
      return `${mode}In: ${inTime} · Paused${reason}`;
    }
    const hours = today.hours != null ? ` · ${today.hours}h worked` : '';
    return `${mode}In: ${inTime} · Working${hours}`;
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div>
        <h4 style={{ margin: 0 }}>Time & Attendance</h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{statusText()}</p>
        {!loading && !today && locationStatus && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: locationStatus.allowed ? '#15803d' : '#b91c1c',
            }}
          >
            {locationStatus.message}
          </p>
        )}
        {error && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b91c1c' }}>{error}</p>
        )}
      </div>

      {canPause && (
        <input
          type="text"
          value={pauseReason}
          onChange={(e) => setPauseReason(e.target.value)}
          placeholder="Pause reason (optional) — lunch, break..."
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 12px',
            fontSize: 13,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxSizing: 'border-box',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 8,
          marginTop: 14,
          width: '100%',
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          style={btnRowStyle}
          disabled={busy || !canClockIn}
          onClick={() => void clockIn()}
        >
          {busy && canClockIn ? 'Wait...' : 'Clock In'}
        </button>

        {canResume ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ ...btnRowStyle, background: '#16a34a', boxShadow: 'none' }}
            disabled={busy}
            onClick={() => void resume()}
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            style={{
              ...btnRowStyle,
              border: '1px solid #f59e0b',
              color: '#b45309',
              background: '#fff',
            }}
            disabled={busy || !canPause}
            onClick={() => void pause()}
          >
            Pause
          </button>
        )}

        <button
          type="button"
          className="btn"
          style={{
            ...btnRowStyle,
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            background: '#fff',
          }}
          disabled={busy || !canClockOut}
          onClick={() => void clockOut()}
        >
          Clock Out
        </button>

        <button
          type="button"
          className="btn"
          style={{
            ...btnRowStyle,
            border: '1px solid #6366f1',
            color: '#6366f1',
            background: '#fff',
          }}
          disabled={busy || !canClockIn}
          onClick={() => void workFromHome()}
        >
          WFH
        </button>
      </div>
    </div>
  );
};

export default ClockCard;
