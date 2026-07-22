import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Clock } from 'lucide-react';
import { tasksApi } from '../services/api';
import { normalizeTaskStatus } from '../utils/task';
import type { TaskTimeSummary } from '../types';

const formatLive = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface TaskTimeTrackerProps {
  taskId: string;
  /** When IN_PROGRESS but timer idle, auto-start once (Kanban drag heal). */
  taskStatus?: string;
  onTaskMaybeUpdated?: () => void;
}

const TaskTimeTracker = ({ taskId, taskStatus, onTaskMaybeUpdated }: TaskTimeTrackerProps) => {
  const [summary, setSummary] = useState<TaskTimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closedMs, setClosedMs] = useState(0);
  const [, setTick] = useState(0);
  const autoStartedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await tasksApi.getTime(taskId);
      setSummary(res.data);
      const timer = res.data.myTimer;
      if (timer.status === 'RUNNING' && timer.runningSince) {
        const openAtFetch = Date.now() - new Date(timer.runningSince).getTime();
        setClosedMs(Math.max(0, timer.totalMs - openAtFetch));
      } else {
        setClosedMs(timer.totalMs);
      }
      setError('');
    } catch (err) {
      console.error('Failed to load task time', err);
      setError('Could not load time tracking.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
    autoStartedRef.current = false;
  }, [load]);

  useEffect(() => {
    if (summary?.myTimer.status !== 'RUNNING') return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [summary?.myTimer.status]);

  // If task is In Progress but timer never started (e.g. Kanban drag), start it once
  useEffect(() => {
    if (loading || busy || !summary || autoStartedRef.current) return;
    if (normalizeTaskStatus(taskStatus ?? '') !== 'IN_PROGRESS') return;
    if (!summary.canTrack) return;
    const anyoneRunning =
      summary.myTimer.status === 'RUNNING' ||
      summary.byUser.some((u) => u.status === 'RUNNING');
    if (anyoneRunning) return;
    if (
      summary.myTimer.status !== 'IDLE' &&
      summary.myTimer.status !== 'STOPPED' &&
      summary.myTimer.status !== 'PAUSED'
    ) {
      return;
    }
    autoStartedRef.current = true;
    void (async () => {
      try {
        const res = await tasksApi.startTime(taskId);
        setSummary(res.data);
        const timer = res.data.myTimer;
        if (timer.status === 'RUNNING' && timer.runningSince) {
          const openAtFetch = Date.now() - new Date(timer.runningSince).getTime();
          setClosedMs(Math.max(0, timer.totalMs - openAtFetch));
        } else {
          setClosedMs(timer.totalMs);
        }
        onTaskMaybeUpdated?.();
      } catch (err) {
        console.warn('Auto-start timer on In Progress failed', err);
        autoStartedRef.current = false;
      }
    })();
  }, [loading, busy, summary, taskStatus, taskId, onTaskMaybeUpdated]);

  const finalMs =
    summary?.myTimer.status === 'RUNNING' && summary.myTimer.runningSince
      ? closedMs + (Date.now() - new Date(summary.myTimer.runningSince).getTime())
      : (summary?.myTimer.totalMs ?? 0);

  const runAction = async (action: 'start' | 'pause' | 'stop') => {
    setBusy(true);
    setError('');
    try {
      const fn =
        action === 'start'
          ? tasksApi.startTime
          : action === 'pause'
            ? tasksApi.pauseTime
            : tasksApi.stopTime;
      const res = await fn(taskId);
      setSummary(res.data);
      const timer = res.data.myTimer;
      if (timer.status === 'RUNNING' && timer.runningSince) {
        const openAtFetch = Date.now() - new Date(timer.runningSince).getTime();
        setClosedMs(Math.max(0, timer.totalMs - openAtFetch));
      } else {
        setClosedMs(timer.totalMs);
      }
      if (action === 'start') onTaskMaybeUpdated?.();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || `Failed to ${action} timer`;
      setError(typeof message === 'string' ? message : `Failed to ${action} timer`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Loading timer...</p>
      </div>
    );
  }

  if (!summary) {
    return error ? (
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{error}</p>
      </div>
    ) : null;
  }

  const status = summary.myTimer.status;
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const canStart =
    summary.canTrack && (status === 'IDLE' || status === 'PAUSED' || status === 'STOPPED');
  const canPause = summary.canTrack && isRunning;
  const canStop = summary.canTrack && (isRunning || isPaused);

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#fff7ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}
        >
          <Clock size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 16 }}>Time on this task</h4>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Pause for lunch/break — paused time is not counted. Unfinished work continues next day.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : status === 'STOPPED' ? 'STOPPED' : 'IDLE'}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: isRunning ? 'var(--primary)' : '#0f172a',
            }}
          >
            {formatLive(finalMs)}
          </p>
        </div>
      </div>

      {summary.canTrack && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !canStart}
            onClick={() => void runAction('start')}
            style={{
              width: 'auto',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: canStart ? 1 : 0.45,
            }}
          >
            <Play size={16} fill="currentColor" />
            {status === 'PAUSED' || status === 'STOPPED' ? 'Resume' : 'Start'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || !canPause}
            onClick={() => void runAction('pause')}
            style={{
              width: 'auto',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              opacity: canPause ? 1 : 0.45,
            }}
          >
            <Pause size={16} fill="currentColor" />
            Pause
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || !canStop}
            onClick={() => void runAction('stop')}
            style={{
              width: 'auto',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              opacity: canStop ? 1 : 0.45,
            }}
          >
            <Square size={14} fill="currentColor" />
            Stop
          </button>
        </div>
      )}

      {!summary.canTrack && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Only the assigned employee can start/pause/stop. You can still view hours below.
        </p>
      )}

      {error && (
        <p style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>TOTAL</p>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>{summary.total.label}</p>
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #eef2f7',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 700 }}>TODAY</p>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>{summary.today.label}</p>
        </div>
      </div>

      {summary.daily.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
            Daily hours
          </p>
          <div
            style={{
              border: '1px solid #eef2f7',
              borderRadius: 10,
              overflow: 'hidden',
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {summary.daily.map((d) => (
              <div
                key={d.date}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#475569' }}>
                  {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span style={{ fontWeight: 600 }}>{d.hours.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.byUser.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
            Hours by person
          </p>
          <div style={{ border: '1px solid #eef2f7', borderRadius: 10, overflow: 'hidden' }}>
            {summary.byUser.map((u) => (
              <div
                key={u.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{u.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                    {u.status === 'RUNNING' ? 'Working now' : u.status}
                  </p>
                </div>
                <span style={{ fontWeight: 700 }}>{u.total.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTimeTracker;
