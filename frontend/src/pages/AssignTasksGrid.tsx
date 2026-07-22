import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { projectsApi, tasksApi, usersApi } from '../services/api';
import type { Project, User } from '../types';

type GridRow = {
  key: string;
  assignedTo: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: string;
};

const emptyRow = (assignedTo = ''): GridRow => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  assignedTo,
  projectId: '',
  title: '',
  description: '',
  priority: 'MEDIUM',
  deadline: '',
});

const cellInput: CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#fff',
  outline: 'none',
};

const AssignTasksGrid = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('assignedTo') || '';

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<GridRow[]>([emptyRow(preselected)]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedUser = users.find((u) => u._id === preselected);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, projectsRes] = await Promise.all([
        usersApi.getAssignees(),
        projectsApi.getAll(),
      ]);
      const userList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const projectList = Array.isArray(projectsRes.data) ? projectsRes.data : [];
      setUsers(userList);
      setProjects(projectList);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          assignedTo: r.assignedTo || preselected || userList[0]?._id || '',
          projectId: r.projectId || projectList[0]?._id || '',
        })),
      );
    } catch (err) {
      console.error(err);
      setError('Failed to load employees and projects.');
    } finally {
      setLoading(false);
    }
  }, [preselected]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = <K extends keyof GridRow>(key: string, field: K, value: GridRow[K]) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        ...emptyRow(last?.assignedTo || preselected),
        projectId: last?.projectId || projects[0]?._id || '',
        priority: last?.priority || 'MEDIUM',
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const handleSubmit = async () => {
    setError('');
    const payload = rows
      .map((r) => ({
        title: r.title.trim(),
        description: r.description.trim() || undefined,
        assignedTo: r.assignedTo,
        projectId: r.projectId || undefined,
        priority: r.priority,
        deadline: r.deadline || undefined,
      }))
      .filter((r) => r.title);

    if (payload.length === 0) {
      setError('Enter at least one task name.');
      return;
    }
    for (const t of payload) {
      if (!t.assignedTo) {
        setError('Every row needs an assignee.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await tasksApi.bulkCreate(payload);
      const focusUser =
        preselected ||
        payload[0]?.assignedTo ||
        '';
      navigate(focusUser ? `/tasks/user/${focusUser}` : '/tasks', {
        replace: true,
        state: { bulkCreated: res.data.created },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : 'Failed to create tasks.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 24px 100px', maxWidth: 1200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
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
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>
              Assign tasks
              {selectedUser ? ` — ${selectedUser.name}` : ''}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Excel-style grid: add multiple rows for one or more employees, then create all.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Link
              to={preselected ? `/tasks/user/${preselected}` : '/tasks'}
              style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}
            >
              View board
            </Link>
            <button
              type="button"
              onClick={addRow}
              disabled={loading}
              title="Add row"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
              }}
            >
              <Plus size={18} />
              Add row
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <>
            <div
              className="card"
              style={{ padding: 0, overflow: 'auto', marginBottom: 16 }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 900,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                    {[
                      'Assignee',
                      'Project',
                      'Task name',
                      'Description',
                      'Priority',
                      'Deadline',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h || 'actions'}
                        style={{
                          padding: '12px 10px',
                          fontWeight: 600,
                          color: '#6b7280',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          borderBottom: '1px solid #e5e7eb',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={row.key}>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', minWidth: 140 }}>
                        <select
                          style={cellInput}
                          value={row.assignedTo}
                          onChange={(e) => updateRow(row.key, 'assignedTo', e.target.value)}
                        >
                          <option value="">Select…</option>
                          {users.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', minWidth: 140 }}>
                        <select
                          style={cellInput}
                          value={row.projectId}
                          onChange={(e) => updateRow(row.key, 'projectId', e.target.value)}
                        >
                          <option value="">Select…</option>
                          {projects.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', minWidth: 160 }}>
                        <input
                          style={cellInput}
                          placeholder="Task name"
                          value={row.title}
                          onChange={(e) => updateRow(row.key, 'title', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', minWidth: 180 }}>
                        <input
                          style={cellInput}
                          placeholder="Description"
                          value={row.description}
                          onChange={(e) => updateRow(row.key, 'description', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', width: 110 }}>
                        <select
                          style={cellInput}
                          value={row.priority}
                          onChange={(e) =>
                            updateRow(
                              row.key,
                              'priority',
                              e.target.value as GridRow['priority'],
                            )
                          }
                        >
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', width: 140 }}>
                        <input
                          type="date"
                          style={cellInput}
                          value={row.deadline}
                          onChange={(e) => updateRow(row.key, 'deadline', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            title="Add row"
                            onClick={addRow}
                            style={{
                              background: '#fff7ed',
                              border: '1px solid #fdba74',
                              borderRadius: 8,
                              padding: 8,
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              display: 'flex',
                            }}
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete row"
                            disabled={rows.length <= 1}
                            onClick={() => removeRow(row.key)}
                            style={{
                              background: rows.length <= 1 ? '#f3f4f6' : '#fef2f2',
                              border: 'none',
                              borderRadius: 8,
                              padding: 8,
                              cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                              color: rows.length <= 1 ? '#9ca3af' : '#dc2626',
                              display: 'flex',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                          {rowIndex === rows.length - 1 && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={submitting}
                              onClick={() => void handleSubmit()}
                              title="Submit / create all tasks"
                              style={{
                                width: 'auto',
                                padding: '8px 14px',
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {submitting ? '…' : 'Submit'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AssignTasksGrid;
