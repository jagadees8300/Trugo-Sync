import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      await axios.post('http://localhost:5000/auth/reset-password', { 
        token,
        newPassword
      });
      setMessage('Password successfully reset! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage('Failed to reset password. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p>Invalid or missing reset token.</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <h2 style={{ marginBottom: '8px' }}>Create New Password</h2>
        <p className="text-muted" style={{ marginBottom: '24px' }}>
          Please enter your new password below.
        </p>

        {message && (
          <div style={{ padding: '12px', backgroundColor: message.includes('success') ? '#e8f5e9' : '#ffebee', color: message.includes('success') ? '#2e7d32' : '#c62828', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: 40 }} 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Save New Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
