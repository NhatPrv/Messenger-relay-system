import React, { useState } from 'react';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Cannot connect to authorization server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        {/* Animated Brand Logo */}
        <div className="auth-logo">
          <Lock size={32} />
        </div>
        
        <h2 className="auth-title">Messenger Relay</h2>
        <p className="auth-subtitle">Enter admin password to access dashboard</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
