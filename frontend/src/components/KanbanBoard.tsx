import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, Plus } from 'lucide-react';
import { tasksApi } from '../services/api';
import { isTaskOverdue, normalizeTaskStatus, formatDateTime, isClientAssignedTask, isClientHighPriorityTask, type TaskStatus } from '../utils/task';
import type { ProjectStage, Task } from '../types';

const BASE_COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'TO_DO', label: 'To Do', color: '#6b7280' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b' },
  { key: 'DONE', label: 'Done', color: '#10b981' },
];

/** Ignore tiny pointer jitter so a click is not treated as a drag. */
const DRAG_THRESHOLD_PX = 8;

const priorityStyle = (priority: string) => {
  if (priority === 'HIGH') return { bg: '#fee2e2', color: '#b91c1c' };
  if (priority === 'MEDIUM') return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

interface KanbanBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  stages?: ProjectStage[];
  onAddStage?: (name: string) => Promise<void>;
}

const KanbanBoard = ({ tasks, onTasksChange, stages = [], onAddStage }: KanbanBoardProps) => {
  const navigate = useNavigate();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showStageForm, setShowStageForm] = useState(false);
  const [stageName, setStageName] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [stageError, setStageError] = useState('');

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  /** True only after the pointer moved past the drag threshold (or a drop completed). */
  const suppressClickRef = useRef(false);

  const resetDragUi = () => {
    setDraggingId(null);
    setDropTarget(null);
    pointerStartRef.current = null;
  };

  useEffect(() => {
    const clearStuckDrag = () => {
      resetDragUi();
      // Allow the next click after tab focus / visibility return
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') clearStuckDrag();
    };

    window.addEventListener('blur', clearStuckDrag);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('dragend', clearStuckDrag);

    return () => {
      window.removeEventListener('blur', clearStuckDrag);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('dragend', clearStuckDrag);
    };
  }, []);

  const columns = useMemo(() => {
    const custom = [...stages]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ key: s.key, label: s.label, color: s.color || '#8b5cf6' }));
    return [...BASE_COLUMNS, ...custom];
  }, [stages]);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    suppressClickRef.current = false;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/task-id', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(taskId);
    suppressClickRef.current = false;
  };

  const handleDrag = (e: React.DragEvent) => {
    // Browsers fire a final drag event at 0,0 — ignore it
    if (e.clientX === 0 && e.clientY === 0) return;
    const start = pointerStartRef.current;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
      suppressClickRef.current = true;
    }
  };

  const handleDragEnd = () => {
    resetDragUi();
    // Click often fires right after dragend — keep suppress briefly, then clear
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  };

  const handleDragLeave = (e: React.DragEvent, status: TaskStatus) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDropTarget((prev) => (prev === status ? null : prev));
    }
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/task-id');
    suppressClickRef.current = true;
    resetDragUi();

    const task = tasks.find((t) => t._id === taskId);
    if (!task || normalizeTaskStatus(task.status) === status) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
      return;
    }

    const previous = tasks;
    onTasksChange(tasks.map((t) => (t._id === taskId ? { ...t, status } : t)));
    setUpdatingId(taskId);

    try {
      // POST /tasks/:id/move-with-timer — auto start on In Progress, stop on Done
      const res = await tasksApi.moveWithTimer(taskId, status);
      onTasksChange(previous.map((t) => (t._id === taskId ? res.data.task : t)));

      // Guarantee timer is running for the current user after drag → In Progress
      if (
        normalizeTaskStatus(status) === 'IN_PROGRESS' &&
        res.data.timer?.myTimer?.status !== 'RUNNING'
      ) {
        try {
          await tasksApi.startTime(taskId);
        } catch (timerErr) {
          console.warn('Auto-start timer after Kanban move failed', timerErr);
        }
      }
    } catch (err) {
      console.error('Kanban move-with-timer failed', err);
      onTasksChange(previous);
    } finally {
      setUpdatingId(null);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
    }
  };

  const openTask = (taskId: string) => {
    if (suppressClickRef.current || updatingId === taskId) return;
    navigate(`/tasks/${taskId}`);
  };

  const columnTasks = (status: TaskStatus) =>
    tasks.filter((t) => normalizeTaskStatus(t.status) === status);

  const submitStage = async () => {
    const name = stageName.trim();
    if (!name || !onAddStage) return;
    setAddingStage(true);
    setStageError('');
    try {
      await onAddStage(name);
      setStageName('');
      setShowStageForm(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setStageError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create stage');
    } finally {
      setAddingStage(false);
    }
  };

  return (
    <div className="kanban-board">
      {columns.map((col) => {
        const items = columnTasks(col.key);
        const isDropTarget = dropTarget === col.key;

        return (
          <div
            key={col.key}
            className={`kanban-column ${isDropTarget ? 'kanban-column--active' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="kanban-column__header">
              <span className="kanban-column__dot" style={{ backgroundColor: col.color }} />
              <span className="kanban-column__title">{col.label}</span>
              <span className="kanban-column__count">{items.length}</span>
            </div>

            <div className="kanban-column__body">
              {items.length === 0 ? (
                <div className="kanban-column__empty">Drop tasks here</div>
              ) : (
                items.map((task) => {
                  const badge = priorityStyle(task.priority);
                  const isDragging = draggingId === task._id;
                  const isUpdating = updatingId === task._id;
                  const overdue = isTaskOverdue(task);
                  const fromClient = isClientAssignedTask(task);
                  const highFromClient = isClientHighPriorityTask(task);
                  const clientLabel =
                    fromClient
                      ? task.createdBy?.name?.trim() || task.project?.clientName?.trim()
                      : undefined;

                  return (
                    <div
                      key={task._id}
                      className={`kanban-card ${isDragging ? 'kanban-card--dragging' : ''} ${isUpdating ? 'kanban-card--updating' : ''} ${overdue ? 'kanban-card--overdue' : ''} ${highFromClient ? 'kanban-card--client-high' : ''}`}
                      draggable={!isUpdating}
                      onPointerDown={handlePointerDown}
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      onClick={() => openTask(task._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openTask(task._id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="kanban-card__top">
                        <div className="kanban-card__top-left">
                          <GripVertical size={14} className="kanban-card__grip" />
                          {clientLabel && (
                            <span className="kanban-card__client">{clientLabel}</span>
                          )}
                        </div>
                        <span
                          className="kanban-card__priority"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {task.priority}
                        </span>
                        {overdue && (
                          <span className="kanban-card__overdue">OVERDUE</span>
                        )}
                      </div>
                      <h4 className="kanban-card__title">{task.title}</h4>
                      {task.description && (
                        <p className="kanban-card__desc">{task.description}</p>
                      )}
                      <div className="kanban-card__meta">
                        {task.project?.name && <span>{task.project.name}</span>}
                        {task.assignedTo?.name && <span>{task.assignedTo.name}</span>}
                        {fromClient && (
                          <span className="kanban-card__meta-client">Client assigned</span>
                        )}
                        {fromClient && task.createdAt && (
                          <span className="kanban-card__meta-time" title="Client assigned time">
                            {formatDateTime(task.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {onAddStage && (
        <div className="kanban-column kanban-column--add">
          <div className="kanban-column__header">
            <span className="kanban-column__dot" style={{ backgroundColor: 'var(--primary)' }} />
            <span className="kanban-column__title">New stage</span>
          </div>
          <div className="kanban-column__body">
            {!showStageForm ? (
              <button
                type="button"
                className="kanban-add-stage"
                onClick={() => setShowStageForm(true)}
              >
                <Plus size={22} />
                <span>Add stage</span>
                <small>e.g. QC, Testing</small>
              </button>
            ) : (
              <div className="kanban-stage-form">
                <input
                  autoFocus
                  type="text"
                  placeholder="Stage name"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitStage();
                    if (e.key === 'Escape') {
                      setShowStageForm(false);
                      setStageError('');
                    }
                  }}
                  disabled={addingStage}
                />
                {stageError && (
                  <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{stageError}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void submitStage()}
                    disabled={addingStage || !stageName.trim()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: 8,
                      background: 'var(--primary)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {addingStage ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStageForm(false);
                      setStageName('');
                      setStageError('');
                    }}
                    disabled={addingStage}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
