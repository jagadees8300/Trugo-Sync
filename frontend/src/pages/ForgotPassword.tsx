import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/auth/forgot-password', { email });
      setMessage(response.data.message || 'If an account exists, an email was sent.');
    } catch (error) {
      setMessage('Failed to send reset email. Please try again.');
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

        {message && (
          <div style={{ padding: '12px', backgroundColor: '#e0f7fa', color: '#006064', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {message}
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              <strong>Note:</strong> Check your backend terminal to see the Ethereal Email test link!
            </div>
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
                placeholder="admin@trugosync.com"
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
