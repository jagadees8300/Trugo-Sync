import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../services/api';

interface ForgotPasswordResponse {
  message: string;
  emailSent?: boolean;
}

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await authApi.forgotPassword(email);
      setResult(response.data);
    } catch {
      setResult({
        message: 'Something went wrong. Please try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <Link to="/login" style={{ color: 'var(--text-main)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h2 style={{ margin: 0 }}>Reset Password</h2>
        </div>

        <p className="text-muted" style={{ marginBottom: '24px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {result && (
          <div
            style={{
              padding: '12px',
              backgroundColor: result.emailSent ? '#ecfdf5' : '#e0f7fa',
              color: result.emailSent ? '#065f46' : '#006064',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: 0 }}>{result.message}</p>
            {result.emailSent && (
              <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>
                Check your inbox and spam folder.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
