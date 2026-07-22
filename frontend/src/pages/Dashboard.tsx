import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import { dashboardApi, authApi } from '../services/api';
import { DAILY_MEETING_URL } from '../constants/meeting';
import { resolveAvatarUrl, isAdmin } from '../utils/task';
import type {
  DashboardStats,
  TeamMemberStatus,
  ProjectProgress,
  ProjectDeadline,
  User as UserType,
} from '../types';

const formatDeadline = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    highPriority: 0,
  });
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [projects, setProjects] = useState<ProjectProgress[]>([]);
  const [deadlines, setDeadlines] = useState<ProjectDeadline[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) setCurrentUser(JSON.parse(stored));

        const [statsRes, teamRes, projectsRes, deadlinesRes, meRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getTeamStatus(),
          dashboardApi.getProjectProgress(),
          dashboardApi.getDeadlines(),
          authApi.getMe().catch(() => null),
        ]);

        setStats(statsRes.data);
        setTeam(
          [...(teamRes.data ?? [])].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
          ),
        );
        setProjects(projectsRes.data);
        setDeadlines(deadlinesRes.data);
        if (meRes) {
          setCurrentUser(meRes.data);
          localStorage.setItem('user', JSON.stringify(meRes.data));
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  const projectStats = {
    total: projects.length,
    completed: projects.filter((p) => p.completionPercent >= 100 && p.total > 0).length,
    pending: projects.filter((p) => !(p.completionPercent >= 100 && p.total > 0)).length,
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
          <div style={{ cursor: 'pointer', padding: 8, backgroundColor: '#fff9f0', borderRadius: 8 }}>
            <Menu size={24} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <UserMenu size={36} avatarUrl={resolveAvatarUrl(currentUser?.avatarUrl)} />
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>
              Trugo Sync Admin
            </p>
            <h2 style={{ marginBottom: 0 }}>Welcome Back</h2>
            <h3 style={{ color: 'var(--primary)', marginBottom: 0 }}>
              {currentUser?.name || 'Admin'}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link to="/create-task" className="btn btn-primary" style={{ flex: 1, minWidth: 140, padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
            + Create Task
          </Link>
          {isAdmin() && (
            <Link to="/create-project" className="btn" style={{ flex: 1, minWidth: 140, border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
              + Create Project
            </Link>
          )}
          <Link to="/reports" className="btn" style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', color: '#374151', background: 'transparent', padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
            Reports
          </Link>
          <Link to="/projects" className="btn" style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', color: '#374151', background: 'transparent', padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
            View Projects
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Overall Task Status</h4>
          <span
            style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}
            onClick={() => navigate('/tasks')}
          >
            View all
          </span>
        </div>

        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL</p>
              <h2 style={{ margin: 0 }}>{pad(stats.total)}</h2>
            </div>
            <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>IN PROGRESS</p>
              <h2 style={{ margin: 0 }}>{pad(stats.inProgress ?? 0)}</h2>
            </div>
            <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>COMPLETED</p>
              <h2 style={{ margin: 0 }}>{pad(stats.completed)}</h2>
            </div>
            <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>PENDING</p>
              <h2 style={{ margin: 0 }}>{pad(stats.pending)}</h2>
            </div>
            <div
              className="card"
              style={{
                flex: '1 1 120px',
                textAlign: 'center',
                padding: '16px 8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
              }}
            >
              <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8, fontWeight: 700 }}>
                HIGH PRIORITY
              </p>
              <h2 style={{ margin: 0, color: '#b91c1c' }}>{pad(stats.highPriority ?? 0)}</h2>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Overall Project Status</h4>
          <span
            style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}
            onClick={() => navigate('/projects')}
          >
            View all
          </span>
        </div>

        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL</p>
              <h2 style={{ margin: 0 }}>{pad(projectStats.total)}</h2>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>COMPLETED</p>
              <h2 style={{ margin: 0 }}>{pad(projectStats.completed)}</h2>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>PENDING</p>
              <h2 style={{ margin: 0 }}>{pad(projectStats.pending)}</h2>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Team Status</h4>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span
              style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/create-employee')}
            >
              + Add Employee
            </span>
            <span
              style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}
              onClick={() => navigate('/tasks')}
            >
              View all
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          {team.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No team data yet.</p>
          ) : (
            team.map((member, idx) => (
              <div key={member.userId}>
                {idx > 0 && <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />}
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/tasks/user/${String(member.userId)}`)}
                  title="View all tasks"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={`https://i.pravatar.cc/100?img=${12 + idx}`} alt={member.name} style={{ width: 24, height: 24, borderRadius: 12 }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{member.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{member.completionPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${member.completionPercent}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    Total: {member.total} | Done: {member.completed} | Pending: {member.pending}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Project Progress</h4>
            </div>
            <div className="card" style={{ padding: 16 }}>
              {projects.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No projects yet.</p>
              ) : (
                projects.map((proj, idx) => (
                  <div key={proj.projectId}>
                    {idx > 0 && <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />}
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${proj.projectId}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{proj.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{proj.completionPercent}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${proj.completionPercent}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                        Total Tasks: {proj.total} | Done: {proj.done} | Active: {proj.active}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 30%', minWidth: 250 }}>
            <div className="card" style={{ backgroundColor: '#fff7ed', padding: 16, marginBottom: 16, border: '1px solid #ffedd5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ backgroundColor: '#f97316', padding: 8, borderRadius: 8, color: 'white' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1f2937' }}>Daily Sync</h5>
                    <p style={{ margin: 0, fontSize: 12, color: '#4b5563', marginTop: 4 }}>Starts in 15 mins - 10.00 AM</p>
                  </div>
                </div>
              </div>
              <a
                href={DAILY_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 0',
                  fontSize: 14,
                  backgroundColor: '#fed7aa',
                  color: '#9a3412',
                  border: 'none',
                  fontWeight: 500,
                  borderRadius: 8,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Join Meeting
              </a>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h5 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#1f2937', fontWeight: 500 }}>Your Projects & Deadlines</h5>
              <hr style={{ border: 0, borderTop: '1px solid #f3f4f6', margin: '0 0 16px 0' }} />
              {deadlines.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No upcoming deadlines.</p>
              ) : (
                deadlines.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{d.name}</span>
                    <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{formatDeadline(d.deadline)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
