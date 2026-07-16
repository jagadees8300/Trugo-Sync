import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus, ChevronRight, Users } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { projectsApi } from '../services/api';
import type { Project } from '../types';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ProjectList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await projectsApi.getAll();
        setProjects(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load projects', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
            borderBottom: '1px solid #eee',
            paddingBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Projects</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              All your projects in one place
            </p>
          </div>
          <Link
            to="/create-project"
            className="btn btn-primary"
            style={{
              width: 'auto',
              padding: '10px 18px',
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={18} />
            Create Project
          </Link>
        </div>

        {loading ? (
          <p className="text-muted">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <Folder size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>No projects yet.</p>
            <Link to="/create-project" className="btn btn-primary" style={{ width: 'auto', textDecoration: 'none', padding: '10px 20px' }}>
              Create your first project
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {projects.map((project) => {
              const progress = project.completionPercent ?? project.progress ?? 0;
              const teamCount = project.teamMembers?.length ?? 0;
              return (
                <div
                  key={project._id}
                  className="card"
                  onClick={() => navigate(`/projects/${project._id}`)}
                  style={{
                    padding: 20,
                    cursor: 'pointer',
                    marginBottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: 16, wordBreak: 'break-word' }}>
                        {project.name}
                      </h4>
                      {project.clientName && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                          {project.clientName}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={20} color="#d1d5db" style={{ flexShrink: 0 }} />
                  </div>

                  {project.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {project.description}
                    </p>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Progress</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          backgroundColor: 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      borderTop: '1px solid #f3f4f6',
                      paddingTop: 12,
                    }}
                  >
                    <span>
                      {project.totalTasks ?? 0} tasks · {project.doneTasks ?? 0} done
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} />
                      {teamCount}
                    </span>
                  </div>

                  {project.deadline && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      Deadline: {formatDate(project.deadline)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectList;
