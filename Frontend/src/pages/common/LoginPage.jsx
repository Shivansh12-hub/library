import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('9123456780'); // Seeded student phone
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === 'owner') navigate('/owner/live-grid');
      else if (loggedUser.role === 'admin') navigate('/admin/analytics');
      else navigate('/explore');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '380px', margin: '60px auto', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Sign In</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Phone / Email</label>
          <input
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Password</label>
          <input
            type="password"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '12px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Quick Test Credentials:</strong>
        <p style={{ margin: '4px 0' }}>Student: <code>9123456780</code> / <code>password123</code></p>
        <p style={{ margin: '4px 0' }}>Owner: <code>9876543210</code> / <code>password123</code></p>
      </div>
    </div>
  );
}