import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Clock, Percent, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

const LoanSimulator = () => {
  const [loanAmount, setLoanAmount] = useState(10000);
  const [duration, setDuration] = useState(24);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      simulate();
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [loanAmount, duration]);

  const simulate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/applications/simulate', {
        loanAmount,
        durationMonths: duration
      });
      setResult(data);
    } catch (error) {
      // User may not have an application yet
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
        <Calculator size={22} /> Loan Simulator
      </h3>
      <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Drag the sliders to see estimated rates based on your risk profile.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Loan Amount</label>
          <span style={{ color: 'var(--accent-primary)', fontWeight: '700', fontSize: '1.1rem' }}>
            ${loanAmount.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min="1000"
          max="100000"
          step="1000"
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          className="slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }} className="text-muted">
          <span>$1,000</span>
          <span>$100,000</span>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Duration</label>
          <span style={{ color: 'var(--accent-secondary)', fontWeight: '700', fontSize: '1.1rem' }}>
            {duration} months
          </span>
        </div>
        <input
          type="range"
          min="6"
          max="60"
          step="6"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }} className="text-muted">
          <span>6 months</span>
          <span>60 months</span>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="simulator-results"
        >
          <div className="sim-stat">
            <Percent size={16} className="text-accent" />
            <div>
              <div className="sim-stat-label">Annual Rate</div>
              <div className="sim-stat-value">{result.annualRate}%</div>
            </div>
          </div>
          <div className="sim-stat">
            <DollarSign size={16} style={{ color: 'var(--success)' }} />
            <div>
              <div className="sim-stat-label">Monthly Payment</div>
              <div className="sim-stat-value">${result.monthlyPayment.toLocaleString()}</div>
            </div>
          </div>
          <div className="sim-stat">
            <Clock size={16} style={{ color: 'var(--warning)' }} />
            <div>
              <div className="sim-stat-label">Total Interest</div>
              <div className="sim-stat-value">${result.totalInterest.toLocaleString()}</div>
            </div>
          </div>
          <div className="sim-stat">
            <DollarSign size={16} style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <div className="sim-stat-label">Total Payment</div>
              <div className="sim-stat-value">${result.totalPayment.toLocaleString()}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LoanSimulator;
