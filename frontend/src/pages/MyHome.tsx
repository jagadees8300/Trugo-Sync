import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import DailyMeetingCard from '../components/DailyMeetingCard';
import ClockCard from '../components/ClockCard';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import { dashboardApi, projectsApi } from '../services/api';
import { getCurrentUserId } from '../utils/task';
import type { DashboardStats } from '../types';

type ProjectHomeStats = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
};

const MyHome = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    highPriority: 0,
  });
  const [projectStats, setProjectStats] = useState<ProjectHomeStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const userId = getCurrentUserId();

  useEffect(() => {
    const load = async () => {
      try {
        const [myStatsRes, projectsRes] = await Promise.all([
          dashboardApi.getMyStats(),
          projectsApi.getAll(),
        ]);
        setStats(myStatsRes.data);

        const projects = projectsRes.data;
        const completed = projects.filter(
          (p) => (p.completionPercent ?? p.progress ?? 0) >= 100 && (p.totalTasks ?? 0) > 0,
        ).length;
        const inProgress = projects.filter((p) => {
          const percent = p.completionPercent ?? p.progress ?? 0;
          const isDone = percent >= 100 && (p.totalTasks ?? 0) > 0;
          if (isDone) return false;
          return (p.activeTasks ?? 0) > 0 || (percent > 0 && percent < 100);
        }).length;
        const pending = projects.length - completed - inProgress;
        setProjectStats({
          total: projects.length,
          completed,
          inProgress,
          pending: Math.max(0, pending),
        });
      } catch (err) {
        console.error('Failed to load my stats', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  const renderStatCards = (
    cards: { label: string; value: number; highlight?: boolean }[],
  ) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="card"
          style={{
            flex: '1 1 140px',
            textAlign: 'center',
            padding: 16,
            ...(card.highlight
              ? {
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                }
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
            {loading ? '--' : pad(card.value)}
          </h2>
        </div>
      ))}
    </div>
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
            marginBottom: 32,
            borderBottom: '1px solid #eee',
            paddingBottom: 16,
          }}
        >
          <div style={{ cursor: 'pointer', padding: 8, backgroundColor: '#fff9f0', borderRadius: 8 }}>
            <Menu size={24} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <UserMenu size={36} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>My Home</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Your tasks — assigned to you and created by you
          </p>
        </div>

        <DailyMeetingCard />

        <ClockCard />

        {renderStatCards([
          { label: 'MY TASKS', value: stats.total },
          { label: 'IN PROGRESS', value: stats.inProgress ?? 0 },
          { label: 'COMPLETED', value: stats.completed },
          { label: 'PENDING', value: stats.pending },
          { label: 'HIGH PRIORITY', value: stats.highPriority ?? 0, highlight: true },
        ])}

        {renderStatCards([
          { label: 'MY PROJECTS', value: projectStats.total },
          { label: 'COMPLETED', value: projectStats.completed },
          { label: 'IN PROGRESS', value: projectStats.inProgress },
          { label: 'PENDING', value: projectStats.pending },
        ])}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to={userId ? `/tasks/user/${userId}` : '/tasks'}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: 160, textAlign: 'center', textDecoration: 'none', padding: '12px 0' }}
          >
            View My Tasks
          </Link>
          <Link
            to="/create-task"
            className="btn"
            style={{
              flex: 1,
              minWidth: 160,
              textAlign: 'center',
              textDecoration: 'none',
              padding: '12px 0',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Plus size={18} /> Create Task
          </Link>
          <Link
            to="/projects"
            className="btn"
            style={{
              flex: 1,
              minWidth: 160,
              textAlign: 'center',
              textDecoration: 'none',
              padding: '12px 0',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Plus size={18} /> View Projects
          </Link>
        </div>
      </div>
    </>
  );
};

export default MyHome;
