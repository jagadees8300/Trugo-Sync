import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Pencil } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { authApi } from '../services/api';
import { resolveAvatarUrl } from '../utils/task';
import { ROLE_LABELS, type User as UserType } from '../types';

const roleLabel = (role?: UserType['role']) => {
  if (!role) return '—';
  if (typeof role === 'string') {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }
  return role.name || '—';
};

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored) as UserType;
          setUser(parsed);
          setName(parsed.name || '');
          setDesignation(parsed.designation || '');
        }
        const res = await authApi.getMe();
        setUser(res.data);
        setName(res.data.name || '');
        setDesignation(res.data.designation || '');
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch {
        /* keep stored user if any */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startEdit = () => {
    setError('');
    setName(user?.name || '');
    setDesignation(user?.designation || '');
    setAvatarFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
    setAvatarFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setName(user?.name || '');
    setDesignation(user?.designation || '');
  };

  const onPickPhoto = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAvatarFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        designation: designation.trim(),
        avatar: avatarFile,
      });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setEditing(false);
      setAvatarFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Could not save profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const photoSrc = previewUrl || resolveAvatarUrl(user?.avatarUrl);

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Account</p>
              <h2 style={{ margin: 0, fontSize: 22 }}>Profile</h2>
            </div>
          </div>
          {!loading && !editing && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={startEdit}
              style={{
                width: 'auto',
                padding: '10px 16px',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Pencil size={16} />
              Edit profile
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-muted">Loading profile...</p>
        ) : (
          <div className="card" style={{ padding: 24, maxWidth: 480 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                  }}
                >
                  <img
                    src={photoSrc}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change photo"
                      style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        background: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Camera size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hidden
                      onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                    />
                  </>
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{user?.name || 'User'}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {error && (
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#dc2626' }}>{error}</p>
            )}

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <input className="form-input" value={roleLabel(user?.role)} disabled />
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input
                    className="form-input"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Field Agent"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => void saveProfile()}
                    style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={saving}
                    onClick={cancelEdit}
                    style={{
                      flex: 1,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Name', value: user?.name },
                  { label: 'Email', value: user?.email },
                  { label: 'Role', value: roleLabel(user?.role) },
                  { label: 'Designation', value: user?.designation || '—' },
                ].map((row) => (
                  <div key={row.label}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {row.label}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 500 }}>
                      {row.value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Profile;
