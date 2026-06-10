import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User, Sun, Moon } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import api from '../services/api';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      api.get('/applications/me').then(res => setApplication(res.data)).catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar fade-in">
      <Link to="/" className="navbar-brand">
        <img src={logo} alt="CredSetu Logo" style={{ height: '32px', width: '32px', borderRadius: '4px' }} />
        CredSetu
      </Link>

      <div className="navbar-nav">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <>
            {user.role !== 'admin' && <NotificationCenter application={application} />}
            <span className="badge badge-success">
              <User size={14} style={{ marginRight: '4px' }} />
              {user.name} ({user.role})
            </span>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Admin Dashboard
              </Link>
            )}
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
