import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, ChevronRight, Plus, LayoutList, Columns3, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import KanbanBoard from '../components/KanbanBoard';
import { projectsApi, tasksApi, usersApi } from '../services/api';
import { getCurrentUserId, isAdmin, isClientRole, isTaskOverdue, normalizeTaskStatus, formatDateTime, isClientAssignedTask, usesAdminHome } from '../utils/task';
import type { Project, Task, User } from '../types';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Tasks' },
  { key: 'TO_DO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { key: 'ALL', label: 'All priorities' },
  { key: 'HIGH', label: 'High' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'LOW', label: 'Low' },
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

type TaskFilters = {
  project: string;
  resource: string;
  priority: string;
  overdueOnly: boolean;
  deadlineFrom: string;
  deadlineTo: string;
  createdFrom: string;
  createdTo: string;
};

const EMPTY_FILTERS: TaskFilters = {
  project: 'ALL',
  resource: 'ALL',
  priority: 'ALL',
  overdueOnly: false,
  deadlineFrom: '',
  deadlineTo: '',
  createdFrom: '',
  createdTo: '',
};

const TaskList = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const currentUserId = getCurrentUserId();
  const admin = isAdmin();
  const canAssignGrid = usesAdminHome();
  const client = isClientRole();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const assigneeId = userId || searchParams.get('assignedTo') || undefined;
  const forbiddenUserView = !admin && userId && userId !== currentUserId;

  const buildTaskParams = useCallback(
    (status?: string) => ({
      assignedTo: assigneeId || (filters.resource !== 'ALL' ? filters.resource : undefined),
      project: filters.project !== 'ALL' ? filters.project : undefined,
      priority: filters.priority !== 'ALL' ? filters.priority : undefined,
      overdue: filters.overdueOnly ? 'true' : undefined,
      deadlineFrom: filters.deadlineFrom || undefined,
      deadlineTo: filters.deadlineTo || undefined,
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
      search: search.trim() || undefined,
      status,
    }),
    [assigneeId, filters, search],
  );

  useEffect(() => {
    if (forbiddenUserView) return;
    const loadMeta = async () => {
      try {
        const [projectsRes, usersRes] = await Promise.all([
          projectsApi.getAll(),
          admin ? usersApi.getAll() : usersApi.getAssignees(),
        ]);
        setProjects(projectsRes.data);
        setAssignees(usersRes.data);
        if (assigneeId) {
          setUser(usersRes.data.find((u) => u._id === assigneeId) || null);
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    loadMeta();
  }, [assigneeId, admin, forbiddenUserView]);

  useEffect(() => {
    if (forbiddenUserView) return;
    const load = async () => {
      setLoading(true);
      try {
        const statusFilter =
          viewMode === 'list' && activeTab !== 'ALL' ? activeTab : undefined;
        const [allRes, filteredRes] = await Promise.all([
          tasksApi.getAll(buildTaskParams()),
          statusFilter
            ? tasksApi.getAll(buildTaskParams(statusFilter))
            : Promise.resolve(null),
        ]);
        setAllTasks(allRes.data);
        setTasks(filteredRes?.data ?? allRes.data);
      } catch (err) {
        console.error('Failed to load tasks', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    activeTab,
    assigneeId,
    buildTaskParams,
    forbiddenUserView,
    viewMode,
  ]);

  const hasActiveFilters =
    filters.project !== 'ALL' ||
    filters.resource !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.overdueOnly ||
    !!filters.deadlineFrom ||
    !!filters.deadlineTo ||
    !!filters.createdFrom ||
    !!filters.createdTo;

  const clearFilters = () => setFilters(EMPTY_FILTERS);

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

  const updateFilter = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <BottomNav />
      <div className="app-container tasks-page" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
              <ArrowLeft size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{pageTitle}</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>
            {canAssignGrid && assigneeId && (
              <button
                type="button"
                onClick={() => navigate(`/assign-tasks?assignedTo=${assigneeId}`)}
                style={{
                  marginLeft: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + Assign task
              </button>
            )}
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

        <div style={{ position: 'relative', marginBottom: showFilters ? 12 : 20 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: 14, color: '#9ca3af' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 44, paddingRight: 44, borderRadius: 12, border: '1px solid #e5e7eb' }}
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            title="Filters"
            style={{
              position: 'absolute',
              right: 12,
              top: 10,
              background: showFilters || hasActiveFilters ? '#fff7ed' : 'none',
              border: showFilters || hasActiveFilters ? '1px solid var(--primary)' : 'none',
              borderRadius: 8,
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal
              size={18}
              color={showFilters || hasActiveFilters ? 'var(--primary)' : '#9ca3af'}
            />
          </button>
        </div>

        {showFilters && (
          <div
            className="card"
            style={{
              marginBottom: 20,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Project
              <select
                className="form-input"
                value={filters.project}
                onChange={(e) => updateFilter('project', e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="ALL">All projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            {!assigneeId && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                Resource
                <select
                  className="form-input"
                  value={filters.resource}
                  onChange={(e) => updateFilter('resource', e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="ALL">All resources</option>
                  {assignees.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Priority
              <select
                className="form-input"
                value={filters.priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                style={{ fontSize: 13 }}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Deadline from
              <input
                type="date"
                className="form-input"
                value={filters.deadlineFrom}
                onChange={(e) => updateFilter('deadlineFrom', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Deadline to
              <input
                type="date"
                className="form-input"
                value={filters.deadlineTo}
                onChange={(e) => updateFilter('deadlineTo', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Created from
              <input
                type="date"
                className="form-input"
                value={filters.createdFrom}
                onChange={(e) => updateFilter('createdFrom', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Created to
              <input
                type="date"
                className="form-input"
                value={filters.createdTo}
                onChange={(e) => updateFilter('createdTo', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#374151',
                alignSelf: 'end',
                paddingBottom: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => updateFilter('overdueOnly', e.target.checked)}
              />
              Overdue only
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  alignSelf: 'end',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        )}

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
              Drag tasks between columns to update status — timer starts on In Progress and stops on Done
              {hasActiveFilters || search ? ` · ${tasks.length} task${tasks.length === 1 ? '' : 's'} shown` : ''}
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
                  const merge = (prev: Task[]) => {
                    const ids = new Set(updated.map((t) => t._id));
                    const rest = prev.filter((t) => !ids.has(t._id));
                    return [...rest, ...updated];
                  };
                  setAllTasks(merge);
                  setTasks(merge);
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
