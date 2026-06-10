import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { UserPlus, KeyRound, RefreshCw, Mail, User } from 'lucide-react';
import logo from '../assets/logo.png';

const Register = () => {
  const [name, setName] = useState('');
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
      const result = await sendOTP(email, name);
      setOtpStep(true);
      setOtpEmail(result.email);
      addToast('Account created! Check your email for the OTP.', 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
      addToast('Email verified! Welcome to CredSetu 🎉', 'success');
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
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '420px', margin: '4rem auto' }}>
      <div className="glass-card">
        <div className="text-center mb-6">
          <img src={logo} alt="CredSetu Logo" style={{ height: '60px', width: '60px', marginBottom: '1rem', borderRadius: '12px', boxShadow: '0 0 15px rgba(0,242,254,0.4)' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {otpStep ? 'Verify Your Email' : 'Create Account'}
          </h2>
          <p className="text-muted">
            {otpStep
              ? `Enter the 6-digit OTP sent to ${otpEmail}`
              : 'Start your journey to better credit with CredSetu'}
          </p>
        </div>

        {/* Info badge */}
        {!otpStep && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.2)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Mail size={14} style={{ color: 'var(--accent-primary)', marginTop: '1px', flexShrink: 0 }} />
            <span>No password needed! We'll send a one-time code to verify your email.</span>
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
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
              <UserPlus size={20} /> {loading ? 'Sending OTP...' : 'Create Account & Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">6-Digit Verification Code</label>
              <input
                type="text"
                className="form-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '10px', fontWeight: 700 }}
                autoFocus
              />
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
                📧 Check your email inbox (and spam folder) for the code.
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
              <KeyRound size={20} /> {loading ? 'Verifying...' : 'Verify & Activate Account'}
            </button>
            <button type="button" onClick={handleResendOTP} disabled={resending} className="btn btn-secondary btn-block mt-2" style={{ fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </form>
        )}

        {!otpStep && (
          <p className="text-center text-muted mt-6" style={{ fontSize: '0.875rem' }}>
            Already have an account? <Link to="/login" className="text-accent">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Register;
