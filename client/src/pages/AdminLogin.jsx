import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { ShieldAlert, KeyRound, RefreshCw, Mail } from 'lucide-react';
import logo from '../assets/logo.png';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useContext(AuthContext);
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      if (result.role !== 'admin') {
        setError('Access Denied. You do not have administrator privileges.');
        return;
      }
      addToast('Admin verified! Entering control panel...', 'success');
      setTimeout(() => { window.location.href = '/admin'; }, 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="glass-card" style={{ borderTop: '4px solid var(--danger)' }}>
        <div className="text-center mb-6">
          <img src={logo} alt="CredSetu Logo" style={{ height: '60px', width: '60px', marginBottom: '1rem', borderRadius: '12px', boxShadow: '0 0 15px rgba(255,0,85,0.4)' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
            Admin Portal
          </h2>
          <p className="text-muted">
            Authorized personnel only
          </p>
        </div>

        {error && (
          <div className="badge badge-danger mb-4 text-center" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Administrator Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.com" autoFocus />
          </div>
          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary btn-block mt-6" style={{ background: 'var(--danger)' }} disabled={loading}>
            <ShieldAlert size={20} /> {loading ? 'Logging in...' : 'Login As Admin'}
          </button>
        </form>

        <p className="text-center text-muted mt-6" style={{ fontSize: '0.875rem' }}>
          Not an admin? <Link to="/login" className="text-accent">User Login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
