import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, Trash2, Upload } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { projectsApi } from '../services/api';
import { isAdmin, isClientRole } from '../utils/task';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const admin = isAdmin();
  const client = isClientRole();
  const [projectName, setProjectName] = useState('');
  const [documents, setDocuments] = useState<ProjectDocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const [projectRes, docsRes] = await Promise.all([
        projectsApi.getById(projectId).catch(() => null),
        projectsApi.listDocuments(projectId),
      ]);
      if (projectRes?.data?.name) {
        setProjectName(projectRes.data.name);
      }
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
    } catch (err) {
      console.error('Failed to load documents', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      const apiMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(
        typeof apiMessage === 'string'
          ? apiMessage
          : status === 403
            ? 'You do not have access to these documents.'
            : 'Failed to load documents.',
      );
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId]);

  const handleUpload = async () => {
    if (!projectId || !selectedFile) return;
    setUploading(true);
    setError('');
    try {
      await projectsApi.uploadDocument(projectId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Upload failed. Use PDF, images, Word, Excel, text, or ZIP (max 10MB).',
      );
    } finally {
      setUploading(false);
    }
  };

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
            onClick={() =>
              navigate(projectId ? (client ? '/client-home' : `/projects/${projectId}`) : '/projects')
            }
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

        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>
            {client ? 'Upload a file for the team' : 'Upload document'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13, maxWidth: 260 }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedFile || uploading}
              onClick={() => void handleUpload()}
              style={{
                width: 'auto',
                padding: '8px 14px',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: !selectedFile || uploading ? 0.6 : 1,
              }}
            >
              <Upload size={16} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            PDF, images, Word, Excel, text, or ZIP · max 10MB
            {client ? ' · Admin and employees on this project can view your files' : ''}
          </p>
        </div>

        {error && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#dc2626' }}>{error}</p>
        )}

        {loading ? (
          <p className="text-muted">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              No documents uploaded yet. Use Upload above to add a file.
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
                        ? ` · ${new Date(doc.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
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
