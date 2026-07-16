import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';

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
    <div className="login-page">
      <div className="login-page__inner">
        <div className="login-page__brand">
          <BrandLogo height={80} style={{ borderRadius: 12 }} />
        </div>
        <h1 className="login-page__title">Forgot Password</h1>
        <p className="login-page__subtitle">
          Enter your email and click Send Reset Link. Then open the email and
          create your new password there.
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
                Check inbox and spam folder. Click{' '}
                <strong>Create New Password</strong> in the email only.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center' }}>
          <Link
            to="/login"
            className="login-page__forgot"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={16} /> Back to Admin Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
