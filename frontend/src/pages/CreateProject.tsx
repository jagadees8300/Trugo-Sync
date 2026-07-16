import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { projectsApi, usersApi } from '../services/api';
import type { User } from '../types';

const PROJECT_CATEGORIES = ['Frontend', 'Backend', 'UI', 'QA'] as const;

const CreateProject = () => {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    usersApi.getAssignees().then((res) => setUsers(res.data)).catch(console.error);
  }, []);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categories.length === 0) {
      alert('Select at least one project category');
      return;
    }
    setSubmitting(true);
    try {
      await projectsApi.create({
        name,
        clientName: clientName || undefined,
        description,
        categories,
        teamMembers,
        startDate: startDate || undefined,
        deadline: deadline || new Date().toISOString(),
      });
      navigate('/projects');
    } catch (error) {
      console.error('Failed to create project', error);
      alert('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <Link to="/projects" style={{ color: 'var(--text-main)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h3 style={{ margin: 0 }}>Create Project</h3>
        </div>

        <form onSubmit={handleCreate}>
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
            disabled={submitting || categories.length === 0}
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateProject;
