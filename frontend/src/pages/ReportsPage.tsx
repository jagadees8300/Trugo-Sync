import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import api from '../services/api';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState('');

  const loadJson = async (path: string) => {
    setLoading(path);
    setError('');
    try {
      const res = await api.get(path, { params: { from: from || undefined, to: to || undefined } });
      setPreview(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setError('Failed to load report');
      setPreview(null);
    } finally {
      setLoading('');
    }
  };

  const downloadCsv = async (path: string, filename: string) => {
    setLoading(path + '-csv');
    setError('');
    try {
      const res = await api.get(path, {
        params: { from: from || undefined, to: to || undefined, format: 'csv' },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export CSV');
    } finally {
      setLoading('');
    }
  };

  const printPdf = () => {
    window.print();
  };

  const reports = [
    { key: 'leave', path: '/reports/leave', label: 'Leave Summary', file: 'leave-summary.csv' },
    {
      key: 'utilization',
      path: '/reports/utilization',
      label: 'Utilization',
      file: 'utilization.csv',
    },
    {
      key: 'attendance',
      path: '/reports/attendance',
      label: 'Attendance',
      file: 'attendance.csv',
    },
    {
      key: 'projects',
      path: '/reports/projects',
      label: 'Project Health',
      file: 'project-health.csv',
    },
  ];

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Reports & Exports</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              CSV download and print-friendly PDF view
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Link to="/dashboard" style={{ color: 'var(--primary)', fontSize: 13 }}>
            ← Dashboard
          </Link>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {reports.map((r) => (
            <div key={r.key} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>{r.label}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ border: '1px solid #e5e7eb', background: '#fff' }}
                  disabled={!!loading}
                  onClick={() => void loadJson(r.path)}
                >
                  {loading === r.path ? 'Loading...' : 'Preview'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!loading}
                  onClick={() => void downloadCsv(r.path, r.file)}
                >
                  Export CSV
                </button>
              </div>
            </div>
          ))}
        </div>

        {preview && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Preview ({preview.length} rows)</h4>
              <button type="button" className="btn" onClick={printPdf} style={{ border: '1px solid #e5e7eb' }}>
                Print / PDF
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {Object.keys(preview[0] ?? {}).map((k) => (
                      <th
                        key={k}
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(preview[0] ?? {}).map((k) => (
                        <td key={k} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                          {String(row[k] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReportsPage;
