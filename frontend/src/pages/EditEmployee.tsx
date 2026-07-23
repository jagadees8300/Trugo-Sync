import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Pencil, Trash2, User, UserCog, Briefcase } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usersApi } from '../services/api';
import { ALL_APP_ROLES, ROLE_LABELS, type AppRole, type User as UserType } from '../types';

const resolveRole = (user: UserType): AppRole => {
  if (typeof user.role === 'string') return user.role as AppRole;
  if (user.role && typeof user.role === 'object' && 'name' in user.role) {
    return String(user.role.name) as AppRole;
  }
  return 'EMPLOYEE';
};

const EditEmployee = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    designation: '',
    role: 'EMPLOYEE' as AppRole,
    password: '',
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getById(id);
      const u = res.data;
      setForm({
        name: u.name || '',
        email: u.email || '',
        designation: u.designation || '',
        role: resolveRole(u),
        password: '',
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 404) {
          setError('Employee not found.');
        } else if (status === 403) {
          setError('Only admin can edit employees.');
        } else {
          setError(typeof message === 'string' ? message : 'Failed to load employee.');
        }
      } else {
        setError('Cannot reach server.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload: {
        name: string;
        email: string;
        designation?: string;
        role: string;
        password?: string;
      } = {
        name: form.name.trim(),
        email: form.email.trim(),
        designation: form.designation.trim() || undefined,
        role: form.role,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      const res = await usersApi.update(id, payload);
      setSuccess(res.data.message || 'Employee updated.');
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 409) {
          setError(typeof message === 'string' ? message : 'This email is already registered.');
        } else if (Array.isArray(message)) {
          setError(message.join(', '));
        } else {
          setError(typeof message === 'string' ? message : 'Failed to update employee.');
        }
      } else {
        setError('Cannot reach server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = window.confirm(
      `Delete ${form.name} (${form.email})?\nThis cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await usersApi.delete(id);
      setSuccess(res.data.message || 'Deleted.');
      navigate('/create-employee', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Failed to delete employee.');
      } else {
        setError('Cannot reach server.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => navigate('/create-employee')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              padding: 0,
              display: 'flex',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Edit Employee</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Update name, email, role, or password
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : error && !form.email ? (
          <div>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <Link to="/create-employee" style={{ color: 'var(--primary)' }}>
              Back to team list
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="card"
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {error && (
              <p style={{ margin: 0, color: '#dc2626', fontSize: 13 }}>{error}</p>
            )}
            {success && (
              <p style={{ margin: 0, color: '#059669', fontSize: 13 }}>{success}</p>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} /> Employee Name
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} /> Email (login)
              </span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={14} /> Designation (optional)
              </span>
              <input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Field Agent"
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCog size={14} /> Role
              </span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                }}
              >
                {ALL_APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} /> New password (optional)
              </span>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{
                  flex: 1,
                  minWidth: 140,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Pencil size={16} />
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || form.role === 'ADMIN'}
                title={form.role === 'ADMIN' ? 'Admin cannot be deleted' : 'Delete employee'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: deleting || form.role === 'ADMIN' ? 'not-allowed' : 'pointer',
                  opacity: form.role === 'ADMIN' ? 0.5 : 1,
                }}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => navigate('/create-employee')}
              style={{
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
              }}
            >
              Back to team list
            </button>
          </form>
        )}
      </div>
    </>
  );
};

export default EditEmployee;
