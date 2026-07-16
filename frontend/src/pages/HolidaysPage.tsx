import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { leaveApi } from '../services/leaveService';
import type { Holiday } from '../types';

const HolidaysPage = () => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', date: '', optional: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getHolidays(year);
      setHolidays(res.data);
    } catch {
      setError('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await leaveApi.createHoliday(form);
      setForm({ name: '', date: '', optional: false });
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to create holiday';
      setError(typeof message === 'string' ? message : 'Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await leaveApi.deleteHoliday(id);
      await load();
    } catch {
      setError('Failed to delete holiday');
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Holidays {year}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Company holidays excluded from leave day counts
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Link to="/leave" style={{ color: 'var(--primary)', fontSize: 13 }}>
            ← Back to Leave
          </Link>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form className="card" onSubmit={handleCreate} style={{ marginBottom: 24, maxWidth: 560 }}>
          <h4 style={{ marginTop: 0 }}>Add Holiday</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 140px' }}>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto', alignSelf: 'end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.optional}
                  onChange={(e) => setForm({ ...form, optional: e.target.checked })}
                />
                Optional
              </label>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </form>

        <div className="card">
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : holidays.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              No holidays configured for {year}.
            </p>
          ) : (
            holidays.map((h) => (
              <div
                key={h._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <strong>{h.name}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(h.date).toLocaleDateString()}
                    {h.optional ? ' · Optional' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fff' }}
                  onClick={() => void handleDelete(h._id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HolidaysPage;
