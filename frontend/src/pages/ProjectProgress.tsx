import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileText, Plus, Upload } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import KanbanBoard from '../components/KanbanBoard';
import { projectsApi } from '../services/api';
import { canManageMilestones, normalizeTaskStatus } from '../utils/task';
import type { Milestone, ProjectDetail, Task } from '../types';

const statLinkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--primary)',
  fontSize: 12,
  fontWeight: 500,
};

const ProjectProgressPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDue, setMilestoneDue] = useState('');
  const [milestoneAssigneeIds, setMilestoneAssigneeIds] = useState<string[]>([]);
  const canEditMilestones = canManageMilestones();

  const teamForMilestones = useMemo(() => {
    return (detail?.assignees ?? []).filter((a) => a.userId !== 'unassigned');
  }, [detail?.assignees]);

  const stages = detail?.project.stages ?? [];

  const statusFilters = useMemo(
    () => [
      { key: 'ALL', label: 'All' },
      { key: 'TO_DO', label: 'To Do' },
      { key: 'IN_PROGRESS', label: 'In Progress' },
      { key: 'DONE', label: 'Done' },
      ...[...stages]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ key: s.key, label: s.label })),
    ],
    [stages],
  );

  const refreshDetail = async () => {
    if (!projectId) return;
    try {
      const res = await projectsApi.getDetail(projectId);
      const { tasks: detailTasks, ...projectDetail } = res.data;
      setDetail(projectDetail);
      if (Array.isArray(detailTasks)) setTasks(detailTasks);
    } catch {
      /* ignore refresh errors */
    }
  };

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      setLoading(true);
      setDocError('');
      setLoadError('');
      setDetail(null);
      setTasks([]);
      setDocumentCount(0);

      try {
        const res = await projectsApi.getDetail(projectId);
        const { tasks: detailTasks, milestones: detailMilestones, ...projectDetail } =
          res.data;
        setDetail(projectDetail);
        setTasks(Array.isArray(detailTasks) ? detailTasks : []);
        if (Array.isArray(detailMilestones) && detailMilestones.length > 0) {
          setMilestones(detailMilestones);
        }
      } catch (err) {
        console.error('Failed to load project detail', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setLoadError(
          status === 403
            ? 'You do not have access to this project.'
            : status === 404
              ? 'Project not found.'
              : 'Could not load this project. Please try again.',
        );
      }

      try {
        const docsRes = await projectsApi.listDocuments(projectId);
        setDocumentCount(docsRes.data.length);
      } catch (err) {
        console.error('Failed to load project documents', err);
      }

      try {
        const msRes = await projectsApi.listMilestones(projectId);
        setMilestones(Array.isArray(msRes.data) ? msRes.data : []);
      } catch (err) {
        console.error('Failed to load milestones', err);
      }
      setLoading(false);
    };

    void load();
  }, [projectId]);

  const refreshDocuments = async () => {
    if (!projectId) return;
    const docsRes = await projectsApi.listDocuments(projectId);
    setDocumentCount(docsRes.data.length);
  };

  const handleUpload = async () => {
    if (!projectId || !selectedFile) return;
    setUploading(true);
    setDocError('');
    try {
      await projectsApi.uploadDocument(projectId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshDocuments();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setDocError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Upload failed. Check file type (max 10MB).',
      );
    } finally {
      setUploading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const assigneeId = task.assignedTo?._id ?? 'unassigned';
      const matchesAssignee =
        assigneeFilter === 'ALL' || assigneeId === assigneeFilter;
      const matchesStatus =
        statusFilter === 'ALL' || normalizeTaskStatus(task.status) === statusFilter;
      return matchesAssignee && matchesStatus;
    });
  }, [tasks, assigneeFilter, statusFilter]);

  const selectedAssignee = detail?.assignees.find((a) => a.userId === assigneeFilter);

  const handleAddStage = async (name: string) => {
    if (!projectId) return;
    const res = await projectsApi.addStage(projectId, { name });
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            project: {
              ...prev.project,
              stages: res.data.stages ?? [],
            },
            stats: {
              ...prev.stats,
              stageCounts: {
                ...(prev.stats.stageCounts ?? {}),
                ...Object.fromEntries(
                  (res.data.stages ?? []).map((s) => [
                    s.key,
                    prev.stats.stageCounts?.[s.key] ?? 0,
                  ]),
                ),
              },
            },
          }
        : prev,
    );
    await refreshDetail();
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--primary)',
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Project Progress</p>
            <h2 style={{ margin: 0, fontSize: 22 }}>
              {loading ? 'Loading...' : detail?.project.name ?? 'Project'}
            </h2>
          </div>
        </div>

        {!loading && detail && (
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Milestones</h4>
            </div>
            {milestones.length === 0 ? (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                No milestones yet.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                {milestones.map((m) => {
                  const assigneeNames = (m.assignees ?? [])
                    .map((a) =>
                      typeof a === 'string' ? a : a.name || a.email || a._id,
                    )
                    .filter(Boolean);
                  return (
                    <div
                      key={m._id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        minWidth: 140,
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{m.title}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        {m.status}
                        {m.dueDate ? ` · ${new Date(m.dueDate).toLocaleDateString()}` : ''}
                      </p>
                      {assigneeNames.length > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                          {assigneeNames.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {canEditMilestones && (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!projectId || !milestoneTitle.trim()) return;
                  if (milestoneAssigneeIds.length === 0) {
                    alert('Mention at least one employee');
                    return;
                  }
                  try {
                    await projectsApi.createMilestone(projectId, {
                      title: milestoneTitle.trim(),
                      dueDate: milestoneDue || undefined,
                      assigneeIds: milestoneAssigneeIds,
                    });
                    setMilestoneTitle('');
                    setMilestoneDue('');
                    setMilestoneAssigneeIds([]);
                    const msRes = await projectsApi.listMilestones(projectId);
                    setMilestones(msRes.data);
                  } catch {
                    alert(
                      'Could not create milestone. Mention employees and use PM/TL/Admin role.',
                    );
                  }
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    placeholder="Milestone title"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    style={{ flex: '1 1 160px' }}
                  />
                  <input
                    type="date"
                    className="form-input"
                    value={milestoneDue}
                    onChange={(e) => setMilestoneDue(e.target.value)}
                    style={{ flex: '0 0 160px' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    disabled={milestoneAssigneeIds.length === 0}
                  >
                    Add Milestone
                  </button>
                </div>
                {teamForMilestones.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                      Mention employees (required — select who should see this)
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {teamForMilestones.map((member) => {
                        const selected = milestoneAssigneeIds.includes(member.userId);
                        return (
                          <button
                            key={member.userId}
                            type="button"
                            onClick={() =>
                              setMilestoneAssigneeIds((prev) =>
                                selected
                                  ? prev.filter((id) => id !== member.userId)
                                  : [...prev, member.userId],
                              )
                            }
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: 16,
                              padding: '4px 10px',
                              fontSize: 12,
                              cursor: 'pointer',
                              background: selected ? 'var(--primary)' : '#f3f4f6',
                              color: selected ? '#fff' : '#374151',
                            }}
                          >
                            {member.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-muted">Loading project tasks...</p>
        ) : loadError || !detail ? (
          <div className="card" style={{ padding: 24 }}>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>
              {loadError || 'Project not found.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/projects')}
              style={{ width: 'auto', padding: '10px 16px' }}
            >
              Back to projects
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>TOTAL</p>
                <h2 style={{ margin: 0 }}>{detail.stats.total}</h2>
              </div>
              <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>COMPLETED</p>
                <h2 style={{ margin: 0 }}>{detail.stats.completed}</h2>
              </div>
              <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>IN PROGRESS</p>
                <h2 style={{ margin: 0 }}>{detail.stats.inProgress}</h2>
              </div>
              <div className="card" style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>PENDING</p>
                <h2 style={{ margin: 0 }}>{detail.stats.pending}</h2>
              </div>
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className="card"
                  style={{ flex: '1 1 120px', textAlign: 'center', padding: 16 }}
                >
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                    {stage.label.toUpperCase()}
                  </p>
                  <h2 style={{ margin: 0 }}>{detail.stats.stageCounts?.[stage.key] ?? 0}</h2>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--primary)" />
                  Documents
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    style={{ fontSize: 13, maxWidth: 220 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedFile || uploading}
                    onClick={() => void handleUpload()}
                    style={{
                      width: 'auto',
                      padding: '8px 14px',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: !selectedFile || uploading ? 0.6 : 1,
                    }}
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/documents`)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    <Eye size={16} />
                    View{documentCount > 0 ? ` (${documentCount})` : ''}
                  </button>
                </div>
              </div>

              {docError && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: '#dc2626' }}>{docError}</p>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 10px' }}>Assigned team</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAssigneeFilter('ALL')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    backgroundColor: assigneeFilter === 'ALL' ? 'var(--primary)' : '#f3f4f6',
                    color: assigneeFilter === 'ALL' ? '#fff' : '#6b7280',
                  }}
                >
                  All ({detail.stats.total})
                </button>
                {detail.assignees.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setAssigneeFilter(member.userId)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      backgroundColor:
                        assigneeFilter === member.userId ? 'var(--primary)' : '#f3f4f6',
                      color: assigneeFilter === member.userId ? '#fff' : '#6b7280',
                    }}
                  >
                    {member.name} ({member.total})
                  </button>
                ))}
              </div>
              {selectedAssignee && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                  {selectedAssignee.name}:{' '}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('DONE')}
                    style={statLinkStyle}
                  >
                    Done {selectedAssignee.completed}
                  </button>
                  {' | '}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('IN_PROGRESS')}
                    style={statLinkStyle}
                  >
                    In progress {selectedAssignee.inProgress}
                  </button>
                  {' | '}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('TO_DO')}
                    style={statLinkStyle}
                  >
                    Pending {selectedAssignee.pending}
                  </button>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {statusFilters.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: statusFilter === tab.key ? 'var(--primary)' : '#f3f4f6',
                    color: statusFilter === tab.key ? '#fff' : '#6b7280',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 && (
              <p className="text-muted text-center" style={{ marginBottom: 12 }}>
                No tasks match this filter. You can still add stages below.
              </p>
            )}
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <KanbanBoard
                tasks={filteredTasks}
                stages={stages}
                onAddStage={handleAddStage}
                onTasksChange={(updated) => {
                  setTasks((prev) => {
                    const map = new Map(prev.map((t) => [t._id, t]));
                    updated.forEach((t) => map.set(t._id, t));
                    const next = Array.from(map.values());
                    void refreshDetail();
                    return next;
                  });
                }}
              />
            </div>
          </>
        )}

        {projectId && (
          <Link
            to={`/create-task?project=${projectId}`}
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
        )}
      </div>
    </>
  );
};

export default ProjectProgressPage;
