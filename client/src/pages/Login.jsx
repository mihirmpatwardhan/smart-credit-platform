import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { LogIn, KeyRound, RefreshCw, Mail } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendOTP, verifyOTP, resendOTP } = useContext(AuthContext);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await sendOTP(email);
      setOtpStep(true);
      setOtpEmail(result.email);
      addToast('OTP sent to your email! Check your inbox.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === 'new_user') {
        setError('No account found with this email. Please sign up first.');
      } else {
        setError(msg || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOTP(otpEmail, otp);
      addToast('Verified! Welcome back 🎉', 'success');
      setTimeout(() => {
        window.location.href = result.role === 'admin' ? '/admin' : '/dashboard';
      }, 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      await resendOTP(otpEmail);
      addToast('New OTP sent to your email!', 'success');
    } catch (e) {
      addToast('Failed to resend OTP', 'error');
    } finally { setResending(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="glass-card">
        <div className="text-center mb-6">
          <img src={logo} alt="CredSetu Logo" style={{ height: '60px', width: '60px', marginBottom: '1rem', borderRadius: '12px', boxShadow: '0 0 15px rgba(0,242,254,0.4)' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {otpStep ? 'Enter OTP' : 'Welcome Back'}
          </h2>
          <p className="text-muted">
            {otpStep
              ? `We sent a 6-digit code to ${otpEmail}`
              : 'Enter your email to receive a login code'}
          </p>
        </div>

        {/* Security Badge */}
        {!otpStep && (
          <div style={{ marginBottom: '1.25rem', padding: '0.6rem 1rem', background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span>We'll send a one-time verification code to your email. No password needed.</span>
          </div>
        )}

        {error && (
          <div className="badge badge-danger mb-4 text-center" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!otpStep ? (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
              <LogIn size={20} /> {loading ? 'Sending OTP...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">6-Digit OTP Code</label>
              <input
                type="text"
                className="form-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }}
                autoFocus
              />
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
                📧 Check your email inbox (and spam folder) for the code.
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
              <KeyRound size={20} /> {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={handleResendOTP} disabled={resending} className="btn btn-secondary btn-block mt-2" style={{ fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </form>
        )}

        {!otpStep && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            <p className="text-muted">Don't have an account? <Link to="/register" className="text-accent">Sign up</Link></p>
            <Link to="/admin-login" className="text-muted" style={{ textDecoration: 'underline' }}>Admin Portal</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
