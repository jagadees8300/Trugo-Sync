import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import { getHomePathForRole } from '../utils/task';

type LoginLocationState = {
  email?: string;
  resetSuccess?: boolean;
  message?: string;
};

const Login = () => {
  const location = useLocation();
  const navState = (location.state || {}) as LoginLocationState;
  const [email, setEmail] = useState(navState.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    navState.resetSuccess
      ? navState.message || 'Password saved successfully. Login with your new password.'
      : null,
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { access_token, user } = response.data;

      if (!access_token) {
        setError('Login failed. Please try again.');
        return;
      }

      localStorage.setItem('token', access_token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      const role =
        typeof user?.role === 'string' ? user.role : user?.role?.name ?? 'EMPLOYEE';
      navigate(getHomePathForRole(role), { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          typeof message === 'string'
            ? message
            : 'Invalid email or password. Please try again.',
        );
      } else {
        setError('Unable to reach server. Make sure the backend is running on port 5000.');
      }
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
        <h1 className="login-page__title">Admin Login</h1>
        <p className="login-page__subtitle">Trugo Sync Productivity Workspace</p>

        {info && (
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
            {info}
          </div>
        )}
        {error && <div className="login-page__error">{error}</div>}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
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
                id="login-email"
                type="email"
                name="email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                Password
              </label>
              <Link to="/forgot-password" className="login-page__forgot">
                Forgot Password?
              </Link>
            </div>
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
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                style={{ paddingLeft: 40, paddingRight: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 24 }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login to Dashboard →'}
          </button>
        </form>

        <div className="login-page__footer">
          <p className="login-page__footer-secure">
            <Lock size={14} aria-hidden />
            Secured Admin Access
          </p>
          <div className="login-page__footer-links">
            <span>Privacy Policy</span>
            &nbsp;·&nbsp;
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
