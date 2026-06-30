import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('admin@trugosync.com');
  const [password, setPassword] = useState('password');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/auth/login', {
        email,
        password
      });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center' }}>
      <div className="text-center" style={{ marginBottom: '40px' }}>
        <div style={{ background: 'var(--primary)', width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h2>Admin Login</h2>
        <p className="text-muted">Trugo Sync Productivity Workspace</p>
      </div>

      <form onSubmit={handleLogin}>
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
              placeholder="admin@trugosync.com"
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="form-label">Password</label>
            <span 
              style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot Password?
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              className="form-input" 
              style={{ paddingLeft: 40, paddingRight: 40 }} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
            <Eye size={18} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)', cursor: 'pointer' }} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
          Login to Dashboard &rarr;
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '40px', fontSize: 12, color: 'var(--text-muted)' }}>
        <p>🔒 SECURED ADMIN ACCESS</p>
        <div style={{ marginTop: 16 }}>
          <span>Privacy Policy</span> &nbsp;&middot;&nbsp; <span>Support</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
