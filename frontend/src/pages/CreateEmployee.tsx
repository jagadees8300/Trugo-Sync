import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Users, Briefcase, UserCog, Trash2, Pencil, Download } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usersApi } from '../services/api';
import { ALL_APP_ROLES, ROLE_LABELS, type AppRole, type User as UserType } from '../types';
import { downloadTeamMembersExcel } from '../utils/exportTeamExcel';

const resolveRole = (user: UserType): string => {
  if (typeof user.role === 'string') return user.role;
  if (user.role && typeof user.role === 'object' && 'name' in user.role) {
    return String(user.role.name);
  }
  return 'EMPLOYEE';
};

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
  const [users, setUsers] = useState<UserType[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const employeeCount = users.filter((u) => resolveRole(u) === 'EMPLOYEE').length;
  const hrCount = users.filter((u) => resolveRole(u) === 'HR').length;
  // Staff created for the office — exclude Admin + Client so a fresh deploy shows 0
  const teamMembers = users
    .filter((u) => {
      const role = resolveRole(u);
      return role !== 'CLIENT' && role !== 'ADMIN';
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const memberCount = teamMembers.length;

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
      await loadUsers();
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

  const handleDeleteMember = async (member: UserType) => {
    const id = member._id || member.id;
    if (!id) return;
    const ok = window.confirm(
      `Delete ${member.name} (${member.email})?\nThis cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await usersApi.delete(id);
      setSuccess(res.data.message || `${member.name} deleted.`);
      await loadUsers();
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
          setError('Only admin can delete team members.');
          return;
        }
        setError(
          typeof message === 'string' ? message : 'Failed to delete team member.',
        );
      } else {
        setError('Cannot reach server. Make sure the backend is running on port 5000.');
      }
    } finally {
      setDeletingId(null);
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

        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <form className="card" onSubmit={handleSubmit} style={{ flex: '1 1 420px', maxWidth: 520 }}>
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

          <aside style={{ flex: '1 1 340px', maxWidth: 480, width: '100%' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fff7ed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Team Overview</h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Counts and all team member names
                  </p>
                </div>
              </div>

              {countsLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Loading team...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #eef2f7',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <Briefcase size={14} color="#64748b" />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>Employees</p>
                      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>{employeeCount}</p>
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #eef2f7',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <UserCog size={14} color="#64748b" />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>HR</p>
                      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>{hrCount}</p>
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        borderRadius: 10,
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <Users size={14} color="var(--primary)" />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>Members</p>
                      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                        {memberCount}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      border: '1px solid #eef2f7',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #eef2f7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        All team members
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {memberCount} name{memberCount === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          disabled={teamMembers.length === 0}
                          onClick={() => {
                            const date = new Date().toISOString().slice(0, 10);
                            downloadTeamMembersExcel(
                              teamMembers,
                              `trugo-team-members-${date}.xlsx`,
                            );
                          }}
                          title="Download team list as Excel"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #fed7aa',
                            background: teamMembers.length === 0 ? '#f8fafc' : '#fff7ed',
                            color: teamMembers.length === 0 ? '#94a3b8' : 'var(--primary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: teamMembers.length === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Download size={14} />
                          Excel
                        </button>
                      </div>
                    </div>

                    {teamMembers.length === 0 ? (
                      <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                        No team members yet.
                      </p>
                    ) : (
                      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                        {teamMembers.map((member, idx) => {
                          const role = resolveRole(member) as AppRole;
                          const roleLabel = ROLE_LABELS[role] ?? role;
                          return (
                            <div
                              key={member._id || member.id || member.email}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '12px 14px',
                                borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    background: '#fff7ed',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {(member.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mid = member._id || member.id;
                                    if (mid) navigate(`/employees/${mid}`);
                                  }}
                                  title="Edit employee"
                                  style={{
                                    minWidth: 0,
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: '#0f172a',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    title={member.name}
                                  >
                                    {member.name}
                                  </p>
                                  <p
                                    style={{
                                      margin: '2px 0 0',
                                      fontSize: 11,
                                      color: 'var(--text-muted)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    title={member.email}
                                  >
                                    {member.email}
                                  </p>
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#64748b',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 999,
                                    padding: '3px 8px',
                                  }}
                                >
                                  {roleLabel}
                                </span>
                                <button
                                  type="button"
                                  title={`Edit ${member.name}`}
                                  onClick={() => {
                                    const mid = member._id || member.id;
                                    if (mid) navigate(`/employees/${mid}`);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid #fed7aa',
                                    background: '#fff7ed',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  title={`Delete ${member.name}`}
                                  disabled={deletingId === (member._id || member.id)}
                                  onClick={() => void handleDeleteMember(member)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    cursor:
                                      deletingId === (member._id || member.id)
                                        ? 'wait'
                                        : 'pointer',
                                    opacity:
                                      deletingId === (member._id || member.id) ? 0.5 : 1,
                                    padding: 0,
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CreateEmployee;
