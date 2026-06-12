import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Background ping to wake up Render server (cold start mitigation)
    api.get('/health').catch(() => {});

    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Send OTP to email — handles both login & new user registration
  const sendOTP = async (email, name) => {
    const { data } = await api.post('/auth/send-otp', { email, name });
    return data;
  };

  // Verify OTP and log in
  const verifyOTP = async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  };

  // Admin login via email & password
  const adminLogin = async (email, password) => {
    const { data } = await api.post('/auth/admin-login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  };

  // Resend OTP
  const resendOTP = async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, sendOTP, verifyOTP, resendOTP, adminLogin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
