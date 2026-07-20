import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { projectsApi, usersApi } from '../services/api';
import { getEntityId } from '../utils/id';
import { isAdmin } from '../utils/task';
import type { User } from '../types';

const PROJECT_CATEGORIES = ['Frontend', 'Backend', 'UI', 'QA'] as const;

const toDateInput = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const CreateProject = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id') || '';
  const isEdit = Boolean(editId);
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientUserId, setClientUserId] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProject, setLoadingProject] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/projects', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    Promise.all([usersApi.getAssignees(), usersApi.getClients()])
      .then(([assigneesRes, clientsRes]) => {
        setUsers(assigneesRes.data);
        setClients(clientsRes.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      setLoadingProject(true);
      setLoadError('');
      try {
        const res = await projectsApi.getById(editId);
        const p = res.data;
        setName(p.name || '');
        setClientName(p.clientName || '');
        const clientRef = p.clientUserId;
        const clientId =
          typeof clientRef === 'string'
            ? clientRef
            : clientRef && typeof clientRef === 'object'
              ? getEntityId(clientRef)
              : '';
        setClientUserId(clientId);
        setDescription(p.description || '');
        setCategories(Array.isArray(p.categories) ? p.categories : []);
        setStartDate(toDateInput(p.startDate));
        setDeadline(toDateInput(p.deadline));
        setTeamMembers(
          (p.teamMembers ?? []).map((m) => (typeof m === 'string' ? m : getEntityId(m))),
        );
      } catch (err) {
        console.error('Failed to load project', err);
        setLoadError('Could not load project for editing.');
      } finally {
        setLoadingProject(false);
      }
    };
    void load();
  }, [editId]);

  const toggleMember = (id: string) => {
    setTeamMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categories.length === 0) {
      alert('Select at least one project category');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        clientName: clientName || undefined,
        description,
        categories,
        teamMembers,
        startDate: startDate || undefined,
        deadline: deadline || (isEdit ? undefined : new Date().toISOString()),
      };
      if (isEdit) {
        await projectsApi.update(editId, {
          ...payload,
          clientUserId: clientUserId || '',
        });
      } else {
        await projectsApi.create({
          ...payload,
          clientUserId: clientUserId || undefined,
          categories,
          deadline: deadline || new Date().toISOString(),
        });
      }
      navigate(isEdit ? `/projects/${editId}` : '/projects');
    } catch (error) {
      console.error(isEdit ? 'Failed to update project' : 'Failed to create project', error);
      alert(isEdit ? 'Failed to update project' : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <Link to={isEdit && editId ? `/projects/${editId}` : '/projects'} style={{ color: 'var(--text-main)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Project' : 'Create Project'}</h3>
        </div>

        {loadError && (
          <p style={{ margin: '0 0 16px', color: '#dc2626', fontSize: 14 }}>{loadError}</p>
        )}

        {loadingProject ? (
          <p className="text-muted">Loading project...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter project title..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Client or company name..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assign Client Login</label>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                Required for client portal — client only sees projects linked to their login
              </p>
              <select
                className="form-input"
                value={clientUserId}
                onChange={(e) => {
                  const id = e.target.value;
                  setClientUserId(id);
                  const selected = clients.find((c) => c._id === id);
                  if (selected && !clientName.trim()) {
                    setClientName(selected.name);
                  }
                }}
              >
                <option value="">No client login (optional)</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="Describe the project goals and scope..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Project Category</label>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                Click to mention categories (required — select one or more)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROJECT_CATEGORIES.map((cat) => {
                  const selected = categories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 20,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        backgroundColor: selected ? 'var(--primary)' : '#f3f4f6',
                        color: selected ? '#fff' : '#6b7280',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: 24 }}>
              <label className="form-label">Team Members</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {users.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => toggleMember(u._id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      backgroundColor: teamMembers.includes(u._id) ? 'var(--primary)' : '#f3f4f6',
                      color: teamMembers.includes(u._id) ? '#fff' : '#6b7280',
                    }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 24 }}
              disabled={submitting || categories.length === 0 || !!loadError}
            >
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Project'}
            </button>
          </form>
        )}
      </div>
    </>
  );
};

export default CreateProject;
