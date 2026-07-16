import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { token: tokenParam } = useParams<{ token?: string }>();
  const token = (tokenParam || searchParams.get('token') || '').trim();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(Boolean(token));
  const [tokenValid, setTokenValid] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setTokenValid(false);
      return;
    }

    let cancelled = false;
    setCheckingToken(true);
    setError(null);

    void authApi
      .validateResetToken(token)
      .then((res) => {
        if (!cancelled) {
          setTokenValid(true);
          if (res.data.email) setAccountEmail(res.data.email);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setTokenValid(false);
        if (axios.isAxiosError(err)) {
          const message = err.response?.data?.message;
          setError(
            typeof message === 'string'
              ? message
              : 'Invalid or expired token. Request a new reset link.',
          );
        } else {
          setError('Unable to validate reset link. Is the backend running?');
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingToken(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token || !tokenValid) {
      setError('Invalid or missing reset link. Please request a new one.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess('Password saved. Opening login...');
      navigate('/login', {
        replace: true,
        state: {
          email: accountEmail,
          resetSuccess: true,
          message: 'Password saved successfully. Login with your new password.',
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          typeof message === 'string'
            ? message
            : 'Failed to reset password. The link may have expired.',
        );
      } else {
        setError('Unable to reach server. Make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token || (!checkingToken && !tokenValid)) {
    return (
      <div className="login-page">
        <div className="login-page__inner">
          <div className="login-page__brand">
            <BrandLogo height={80} style={{ borderRadius: 12 }} />
          </div>
          <h1 className="login-page__title">Link Already Used</h1>
          <p className="login-page__subtitle">
            {error ||
              'This reset link was already used or expired. If you already saved a new password, go to Login.'}
          </p>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
          >
            Go to Login
          </Link>
          <p style={{ marginTop: 16, textAlign: 'center' }}>
            <Link to="/forgot-password" className="login-page__forgot">
              Need a new reset link?
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__inner">
        <div className="login-page__brand">
          <BrandLogo height={80} style={{ borderRadius: 12 }} />
        </div>
        <h1 className="login-page__title">Create New Password</h1>
        <p className="login-page__subtitle">
          Set a new password for your admin account, then sign in.
        </p>

        {checkingToken && (
          <p className="login-page__subtitle" style={{ marginBottom: 16 }}>
            Checking reset link...
          </p>
        )}

        {error && <div className="login-page__error">{error}</div>}
        {success && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: 14,
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
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
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                required
                disabled={loading || checkingToken || Boolean(success)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
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
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
                required
                disabled={loading || checkingToken || Boolean(success)}
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  padding: 4,
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading || checkingToken || Boolean(success)}
          >
            {loading ? 'Saving...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
