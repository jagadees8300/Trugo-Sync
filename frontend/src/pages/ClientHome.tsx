import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus, FileText, CheckSquare, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import { dashboardApi, projectsApi, tasksApi } from '../services/api';
import type { DashboardStats, Project, Task } from '../types';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ClientHome = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    highPriority: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [projectsRes, tasksRes, statsRes] = await Promise.all([
          projectsApi.getAll(),
          tasksApi.getAll(),
          dashboardApi.getMyStats(),
        ]);
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
        setTaskStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load client home', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(
          status === 401
            ? 'Session expired. Please log in again.'
            : 'Could not load your projects. Check the API is running.',
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const highPriorityTasks = tasks.filter(
    (t) => t.priority === 'HIGH' && t.status !== 'DONE' && t.status !== 'COMPLETED',
  );

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Client Portal</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Your assigned projects and tasks only
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {error && (
          <p style={{ margin: '0 0 16px', color: '#dc2626', fontSize: 14 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Projects', value: projects.length },
            { label: 'Total Tasks', value: taskStats.total },
            { label: 'In Progress', value: taskStats.inProgress ?? 0 },
            { label: 'Completed', value: taskStats.completed },
            { label: 'Pending', value: taskStats.pending },
            { label: 'High Priority', value: taskStats.highPriority ?? 0, highlight: true },
          ].map((card) => (
            <div
              key={card.label}
              className="card"
              style={{
                flex: '1 1 140px',
                textAlign: 'center',
                padding: 16,
                ...(card.highlight
                  ? { border: '1px solid #fecaca', background: '#fef2f2' }
                  : {}),
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: card.highlight ? '#b91c1c' : 'var(--text-muted)',
                  margin: '0 0 8px',
                  fontWeight: card.highlight ? 700 : 400,
                }}
              >
                {card.label}
              </p>
              <h2 style={{ margin: 0, color: card.highlight ? '#b91c1c' : undefined }}>
                {loading ? '--' : String(card.value).padStart(2, '0')}
              </h2>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <Link to="/create-task" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} style={{ marginRight: 6 }} />
            Assign Task
          </Link>
          <Link to="/projects" className="btn" style={{ textDecoration: 'none', border: '1px solid #e5e7eb' }}>
            <Folder size={16} style={{ marginRight: 6 }} />
            My Projects
          </Link>
          <Link to="/tasks" className="btn" style={{ textDecoration: 'none', border: '1px solid #e5e7eb' }}>
            <CheckSquare size={16} style={{ marginRight: 6 }} />
            All Tasks
          </Link>
        </div>

        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Assigned Projects</h3>
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-muted">
            No projects assigned to your client account yet. Ask admin to assign your login on the project.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {projects.map((project) => (
              <div
                key={project._id}
                className="card"
                style={{ padding: 16, cursor: 'pointer', marginBottom: 0 }}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px' }}>{project.name}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                      Deadline: {formatDate(project.deadline)} · Progress:{' '}
                      {project.completionPercent ?? project.progress ?? 0}%
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ border: '1px solid #e5e7eb', padding: '6px 10px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project._id}/documents`);
                      }}
                    >
                      <FileText size={14} />
                    </button>
                    <ChevronRight size={18} color="#9ca3af" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>High Priority Tasks</h3>
        {highPriorityTasks.length === 0 ? (
          <p className="text-muted">No high priority open tasks.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {highPriorityTasks.slice(0, 5).map((task) => (
              <div
                key={task._id}
                className="card"
                onClick={() => navigate(`/tasks/${task._id}`)}
                style={{
                  padding: 14,
                  marginBottom: 0,
                  cursor: 'pointer',
                  borderLeft: '4px solid #dc2626',
                  backgroundColor: '#fef2f2',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ color: '#991b1b' }}>{task.title}</strong>
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>HIGH</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Due: {formatDate(task.deadline)} · Status: {task.status.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ClientHome;
