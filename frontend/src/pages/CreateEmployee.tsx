import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usersApi } from '../services/api';
import { ALL_APP_ROLES, ROLE_LABELS, type AppRole } from '../types';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    designation: '',
    role: 'EMPLOYEE' as AppRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await usersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        designation: form.designation.trim() || undefined,
        role: form.role,
      });
      setSuccess(
        `${res.data.message} — ${res.data.user.email} can now log in with the assigned password.`,
      );
      setForm({ name: '', email: '', password: '', designation: '', role: 'EMPLOYEE' });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 401) {
          setError('Session expired. Please log in again.');
          navigate('/login', { replace: true });
          return;
        }
        if (status === 403) {
          setError('Only admin can create employees.');
          return;
        }
        if (status === 409) {
          setError(typeof message === 'string' ? message : 'This email is already registered.');
          return;
        }
        if (Array.isArray(message)) {
          setError(message.join(', '));
          return;
        }
        setError(
          typeof message === 'string' ? message : 'Failed to create employee. Please try again.',
        );
      } else {
        setError('Cannot reach server. Make sure the backend is running on port 5000.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Create Employee</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Set email and password for a new team member
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {success}
          </div>
        )}

        <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          <div className="form-group">
            <label className="form-label">Employee Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gopinath, Hariharan"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email (login)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="gopi@trugosync.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password (assigned by admin)</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 40, paddingRight: 40 }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Designation (optional)</label>
            <input
              type="text"
              className="form-input"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g. Field Agent"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
            >
              {ALL_APP_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, border: '1px solid #e5e7eb', background: '#fff' }}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateEmployee;
