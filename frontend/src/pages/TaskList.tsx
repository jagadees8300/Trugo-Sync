import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, ChevronRight, Plus, LayoutList, Columns3 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import KanbanBoard from '../components/KanbanBoard';
import { tasksApi, usersApi } from '../services/api';
import { getCurrentUserId, isAdmin, isClientRole, isTaskOverdue, normalizeTaskStatus, formatDateTime, isClientAssignedTask } from '../utils/task';
import type { Task, User } from '../types';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Tasks' },
  { key: 'TO_DO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusBadgeStyle = (status: string) => {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'DONE') {
    return { bg: '#d1fae5', color: '#065f46' };
  }
  if (normalized === 'IN_PROGRESS') {
    return { bg: '#fef3c7', color: '#92400e' };
  }
  return { bg: '#f3f4f6', color: '#6b7280' };
};

const TaskList = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const currentUserId = getCurrentUserId();
  const admin = isAdmin();
  const client = isClientRole();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const assigneeId = userId || searchParams.get('assignedTo') || undefined;
  const forbiddenUserView = !admin && userId && userId !== currentUserId;

  useEffect(() => {
    if (forbiddenUserView) return;
    const load = async () => {
      setLoading(true);
      try {
        const baseParams = { assignedTo: assigneeId, search: search || undefined };
        const statusFilter = activeTab === 'ALL' ? undefined : activeTab;
        const [allRes, filteredRes, usersRes] = await Promise.all([
          tasksApi.getAll(baseParams),
          viewMode === 'kanban' || statusFilter === undefined
            ? Promise.resolve(null)
            : tasksApi.getAll({ ...baseParams, status: statusFilter }),
          assigneeId
            ? admin
              ? usersApi.getAll()
              : usersApi.getAssignees()
            : Promise.resolve(null),
        ]);
        setAllTasks(allRes.data);
        setTasks(filteredRes?.data ?? allRes.data);
        if (assigneeId && usersRes) {
          setUser(usersRes.data.find((u) => u._id === assigneeId) || null);
        }
      } catch (err) {
        console.error('Failed to load tasks', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, assigneeId, search, viewMode, admin, forbiddenUserView]);

  if (forbiddenUserView) {
    return <Navigate to={`/tasks/user/${currentUserId}`} replace />;
  }

  const getTabCount = (tabKey: string) => {
    if (tabKey === 'ALL') return allTasks.length;
    return allTasks.filter((t) => normalizeTaskStatus(t.status) === tabKey).length;
  };

  const pageTitle = user
    ? `${user.name} - Tasks`
    : admin
      ? 'Tasks'
      : client
        ? 'My Assigned Tasks'
        : 'My Tasks';
  const subtitle = user
    ? 'Tasks for this team member'
    : admin
      ? 'All team tasks — including client assignments'
      : client
        ? 'Tasks you assigned on your projects'
        : 'Assigned to you and created by you — including client requests';

  return (
    <>
      <BottomNav />
      <div className="app-container tasks-page" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
              <ArrowLeft size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>{pageTitle}</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="view-toggle">
              <button
                type="button"
                className={viewMode === 'kanban' ? 'view-toggle__btn view-toggle__btn--active' : 'view-toggle__btn'}
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
              >
                <Columns3 size={18} />
              </button>
              <button
                type="button"
                className={viewMode === 'list' ? 'view-toggle__btn view-toggle__btn--active' : 'view-toggle__btn'}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <LayoutList size={18} />
              </button>
            </div>
            <Search size={22} color="#9ca3af" />
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: 14, color: '#9ca3af' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44, paddingRight: 44, borderRadius: 12, border: '1px solid #e5e7eb' }}
          />
          <SlidersHorizontal size={18} style={{ position: 'absolute', right: 16, top: 14, color: '#9ca3af' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {viewMode === 'list' &&
            STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  backgroundColor: activeTab === tab.key ? 'var(--primary)' : '#f3f4f6',
                  color: activeTab === tab.key ? '#fff' : '#6b7280',
                }}
              >
                {tab.label}
                {getTabCount(tab.key) > 0 ? ` (${getTabCount(tab.key)})` : ''}
              </button>
            ))}
          {viewMode === 'kanban' && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Drag tasks between columns to update status
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-muted text-center">Loading tasks...</p>
        ) : viewMode === 'kanban' ? (
          tasks.length === 0 ? (
            <p className="text-muted text-center">No tasks found.</p>
          ) : (
            <div className="tasks-kanban">
              <KanbanBoard
                tasks={tasks}
                onTasksChange={(updated) => {
                  setTasks(updated);
                  setAllTasks(updated);
                }}
              />
            </div>
          )
        ) : tasks.length === 0 ? (
          <p className="text-muted text-center">No tasks found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map((task) => {
              const badge = statusBadgeStyle(task.status);
              const overdue = isTaskOverdue(task);
              return (
                <div
                  key={task._id}
                  className="card"
                  onClick={() => navigate(`/tasks/${task._id}`)}
                  style={{
                    padding: 20,
                    cursor: 'pointer',
                    marginBottom: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'box-shadow 0.2s',
                    border: overdue ? '1px solid #93c5fd' : undefined,
                    backgroundColor: overdue ? '#eff6ff' : undefined,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 4,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          letterSpacing: '0.5px',
                        }}
                      >
                        {normalizeTaskStatus(task.status).replace('_', ' ')}
                      </span>
                      {overdue && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#1d4ed8',
                            background: '#dbeafe',
                            padding: '2px 8px',
                            borderRadius: 4,
                            letterSpacing: '0.3px',
                          }}
                        >
                          OVERDUE
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(task.updatedAt || task.createdAt)}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>{task.title}</h4>
                    {(isClientAssignedTask(task) || task.project?.clientName) && (
                      <p style={{ margin: '0 0 6px', fontSize: 12 }}>
                        {isClientAssignedTask(task) ? (
                          <>
                            <span
                              style={{
                                color: '#166534',
                                fontWeight: 700,
                                background: '#dcfce7',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {task.createdBy?.name || task.project?.clientName || 'Client'}
                            </span>
                            {' · Client assigned'}
                            {task.createdAt ? (
                              <span style={{ marginLeft: 8, color: '#1d4ed8', fontWeight: 600 }}>
                                {formatDateTime(task.createdAt)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            Client: {task.project?.clientName}
                          </span>
                        )}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {task.description || 'No description'}
                    </p>
                  </div>
                  <ChevronRight size={20} color="#d1d5db" />
                </div>
              );
            })}
          </div>
        )}

        <Link
          to={
            client
              ? '/create-task'
              : assigneeId
                ? `/create-task?assignedTo=${assigneeId}`
                : '/create-task'
          }
          title={client ? 'Assign Task' : 'Create Task'}
          style={{
            position: 'fixed',
            bottom: 90,
            right: 32,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(255, 152, 0, 0.5)',
            textDecoration: 'none',
            zIndex: 50,
          }}
        >
          <Plus size={28} color="#fff" />
        </Link>
      </div>
    </>
  );
};

export default TaskList;
