import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Send, AlertCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { tasksApi } from '../services/api';
import { isTaskOverdue, normalizeTaskStatus } from '../utils/task';
import type { Task } from '../types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return formatDate(dateStr);
};

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [comment, setComment] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadTask = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const [res, subRes] = await Promise.all([
        tasksApi.getById(id),
        tasksApi.getSubtasks(id).catch(() => ({ data: [] as Task[] })),
      ]);
      setTask(res.data);
      setSubtasks(subRes.data);
    } catch (err) {
      console.error('Failed to load task', err);
      setTask(null);
      const status = (err as { response?: { status?: number } })?.response?.status;
      const apiMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      if (status === 403) {
        setLoadError(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'You do not have access to this task.',
        );
      } else if (status === 404) {
        setLoadError('Task not found.');
      } else {
        setLoadError('Could not load this task. Check the API is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    try {
      const res = await tasksApi.update(id, { status: 'IN_PROGRESS' });
      setTask(res.data);
    } catch (err) {
      console.error('Failed to start task', err);
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    try {
      const res = await tasksApi.update(id, { status: 'TO_DO' });
      setTask(res.data);
    } catch (err) {
      console.error('Failed to reopen task', err);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      const res = await tasksApi.updateStatus(id, 'DONE');
      setTask(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to complete task';
      alert(typeof message === 'string' ? message : 'Failed to complete task');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await tasksApi.addComment(id, comment.trim());
      setTask(res.data);
      setComment('');
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <BottomNav />
        <div className="app-container"><p className="text-muted text-center">Loading...</p></div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <BottomNav />
        <div className="app-container" style={{ padding: 24, textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            {loadError || 'Task not found.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
        </div>
      </>
    );
  }

  const normalizedStatus = normalizeTaskStatus(task.status);
  const isCompleted = normalizedStatus === 'DONE';
  const isInProgress = normalizedStatus === 'IN_PROGRESS';
  const isPending = normalizedStatus === 'TO_DO';
  const isCustomStage = !isCompleted && !isInProgress && !isPending;
  const overdue = isTaskOverdue(task);
  const taskId = `TRU-${task._id.slice(-3).toUpperCase()}`;

  const statusBadgeStyle = isCompleted
    ? { bg: '#d1fae5', color: '#065f46' }
    : isInProgress
      ? { bg: '#fef3c7', color: '#92400e' }
      : isCustomStage
        ? { bg: '#ede9fe', color: '#5b21b6' }
        : { bg: '#f3f4f6', color: '#6b7280' };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
              <ArrowLeft size={24} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Task Details</h2>
          </div>
          <Search size={22} color="#9ca3af" />
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 60%', minWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 4,
                  backgroundColor: statusBadgeStyle.bg,
                  color: statusBadgeStyle.color,
                }}
              >
                {normalizedStatus.replace(/_/g, ' ')}
              </span>
              {overdue && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>OVERDUE</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {taskId}</span>
            </div>

            <h2 style={{ margin: '0 0 16px 0', fontSize: 24 }}>{task.title}</h2>

            {Array.isArray(task.dependsOn) && task.dependsOn.length > 0 && (
              <div className="card" style={{ padding: 12, marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                  BLOCKED BY
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {task.dependsOn.map((dep) => {
                    const depId = typeof dep === 'string' ? dep : dep._id;
                    const title = typeof dep === 'string' ? dep : dep.title;
                    const status = typeof dep === 'string' ? '' : dep.status;
                    return (
                      <button
                        key={depId}
                        type="button"
                        className="btn"
                        style={{
                          padding: '6px 10px',
                          fontSize: 12,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                        }}
                        onClick={() => navigate(`/tasks/${depId}`)}
                      >
                        {title} {status ? `(${status})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Subtasks</h4>
                <button
                  type="button"
                  className="btn"
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    background: '#fff',
                  }}
                  onClick={() =>
                    navigate(
                      `/create-task?project=${typeof task.projectId === 'string' ? task.projectId : (task.project as any)?._id || ''}&parentTaskId=${task._id}&assignedTo=${(task.assignedTo as any)?._id || ''}`,
                    )
                  }
                >
                  + Add
                </button>
              </div>
              {subtasks.length === 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  No subtasks yet.
                </p>
              ) : (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
                  {subtasks.map((st) => (
                    <li key={st._id} style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/tasks/${st._id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 14,
                        }}
                      >
                        {st.title}
                      </button>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        {st.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <form
                style={{ display: 'flex', gap: 8, marginTop: 12 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!subtaskTitle.trim() || !id) return;
                  const assigneeId =
                    typeof task.assignedTo === 'object' && task.assignedTo
                      ? (task.assignedTo as any)._id
                      : '';
                  const projectId =
                    typeof task.projectId === 'string'
                      ? task.projectId
                      : (task.project as any)?._id;
                  if (!assigneeId || !projectId) {
                    alert('Parent task needs assignee and project to add a subtask.');
                    return;
                  }
                  try {
                    await tasksApi.create({
                      title: subtaskTitle.trim(),
                      assignedTo: assigneeId,
                      projectId,
                      parentTaskId: id,
                    });
                    setSubtaskTitle('');
                    await loadTask();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to create subtask');
                  }
                }}
              >
                <input
                  className="form-input"
                  placeholder="Quick add subtask"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  Add
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {isPending && (
                <button
                  onClick={handleStart}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', borderRadius: 8 }}
                >
                  Start Task
                </button>
              )}
              {isInProgress && (
                <button
                  onClick={handleComplete}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', borderRadius: 8 }}
                >
                  Mark Complete
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={handleReopen}
                  className="btn"
                  style={{
                    width: 'auto',
                    padding: '10px 24px',
                    backgroundColor: '#92400e',
                    color: '#fff',
                    borderRadius: 8,
                  }}
                >
                  Reopen Task
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'Project', value: task.project?.name || '—' },
                { label: 'Assigned Date', value: formatDate(task.createdAt) },
                {
                  label: 'Priority',
                  value: task.priority === 'HIGH' ? 'High' : 'Low',
                  icon: task.priority === 'HIGH',
                },
                { label: 'Assignee', value: task.assignedTo?.name || '—' },
              ].map((item) => (
                <div key={item.label} className="card" style={{ padding: 16, marginBottom: 0 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                    {item.label}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.icon && <AlertCircle size={16} color="#dc2626" />}
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 32 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 12 }}>
                TASK DESCRIPTION
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                {task.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 16 }}>
                TASK HISTORY
              </h4>
              <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 20, marginLeft: 8 }}>
                {(task.history || []).slice().reverse().map((entry, i) => (
                  <div key={i} style={{ marginBottom: 20, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -27,
                        top: 4,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: entry.action.includes('Completed') ? '#10b981' : '#d1d5db',
                        border: '2px solid #fff',
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{entry.action}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDateTime(entry.changedAt)}
                      {entry.changedBy && typeof entry.changedBy === 'object'
                        ? ` by ${(entry.changedBy as { name: string }).name}`
                        : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 30%', minWidth: 280 }}>
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Discussion</h4>
              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {(task.comments || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No comments yet.</p>
                ) : (
                  (task.comments || []).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: i % 2 === 1 ? '#fff7ed' : '#f9fafb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {c.user?.name ?? c.author?.name ?? 'User'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ flex: 1, borderRadius: 8 }}
                />
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  style={{
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 8,
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetails;
