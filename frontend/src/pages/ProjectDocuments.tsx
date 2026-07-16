import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, Trash2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { dashboardApi, projectsApi } from '../services/api';
import { isAdmin } from '../utils/task';
import type { ProjectDocumentFile, User } from '../types';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const uploaderName = (uploadedBy?: User | string) => {
  if (!uploadedBy) return 'Unknown';
  if (typeof uploadedBy === 'string') return 'User';
  return uploadedBy.name || uploadedBy.email || 'User';
};

const canPreviewInline = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType === 'text/plain';

const ProjectDocumentsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const admin = isAdmin();
  const [projectName, setProjectName] = useState('');
  const [documents, setDocuments] = useState<ProjectDocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const [detailRes, docsRes] = await Promise.all([
        dashboardApi.getProjectDetail(projectId),
        projectsApi.listDocuments(projectId),
      ]);
      setProjectName(detailRes.data.project.name);
      setDocuments(docsRes.data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId]);

  const openDocument = async (
    doc: ProjectDocumentFile,
    disposition: 'inline' | 'attachment',
  ) => {
    if (!projectId) return;
    setError('');
    try {
      const mode =
        disposition === 'inline' && canPreviewInline(doc.mimeType)
          ? 'inline'
          : 'attachment';
      const res = await projectsApi.fetchDocumentBlob(projectId, doc._id, mode);
      const url = URL.createObjectURL(res.data);
      if (mode === 'inline') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Could not open document.');
    }
  };

  const handleDelete = async (doc: ProjectDocumentFile) => {
    if (!projectId || !admin) return;
    if (!window.confirm(`Delete "${doc.originalName}"?`)) return;
    setError('');
    try {
      await projectsApi.deleteDocument(projectId, doc._id);
      await load();
    } catch {
      setError('Could not delete document.');
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => navigate(projectId ? `/projects/${projectId}` : '/projects')}
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
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              {projectName || 'Project'} · Documents
            </p>
            <h2 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={22} color="var(--primary)" />
              All uploaded files
            </h2>
          </div>
        </div>

        {error && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#dc2626' }}>{error}</p>
        )}

        {loading ? (
          <p className="text-muted">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              No documents uploaded yet. Go back and use Upload on the project page.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
              {documents.length} file{documents.length === 1 ? '' : 's'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    background: '#f9fafb',
                    borderRadius: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={doc.originalName}
                    >
                      {doc.originalName}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatBytes(doc.size)}
                      {' · '}
                      {uploaderName(doc.uploadedBy)}
                      {doc.createdAt
                        ? ` · ${new Date(doc.createdAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => void openDocument(doc, 'inline')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#374151',
                      }}
                    >
                      <Eye size={14} />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDocument(doc, 'attachment')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #fed7aa',
                        background: '#fff9f0',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#9a3412',
                      }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                    {admin && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(doc)}
                        title="Delete"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          cursor: 'pointer',
                          color: '#dc2626',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectDocumentsPage;
