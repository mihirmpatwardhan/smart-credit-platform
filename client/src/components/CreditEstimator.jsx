import React, { useState } from 'react';
import api from '../services/api';
import { Zap, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const CreditEstimator = () => {
  const [formData, setFormData] = useState({
    income: '',
    existingDebt: '',
    employmentYears: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEstimate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/applications/estimate', {
        income: Number(formData.income),
        existingDebt: Number(formData.existingDebt),
        employmentYears: Number(formData.employmentYears)
      });
      setResult(data);
    } catch (err) {
      setError('Could not generate estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const gaugeColor = result
    ? result.riskScore >= 70 ? '#00ff87' : result.riskScore >= 40 ? '#ffb703' : '#ff0055'
    : '#00f2fe';

  return (
    <div className="estimator-section">
      <div className="estimator-container">
        <div className="estimator-form-side">
          <div className="badge mb-4" style={{ background: 'rgba(0,242,254,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(0,242,254,0.3)' }}>
            <Zap size={14} /> Quick Estimate — No Login Required
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 700 }}>Check Your Credit Score</h2>
          <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
            Get an instant, free estimate of your creditworthiness. No account needed.
          </p>
          <form onSubmit={handleEstimate}>
            <div className="form-group">
              <label className="form-label">Annual Income ($)</label>
              <input type="number" name="income" className="form-input" value={formData.income} onChange={handleChange} required min="0" placeholder="e.g. 65000" />
            </div>
            <div className="form-group">
              <label className="form-label">Existing Debt ($)</label>
              <input type="number" name="existingDebt" className="form-input" value={formData.existingDebt} onChange={handleChange} required min="0" placeholder="e.g. 12000" />
            </div>
            <div className="form-group">
              <label className="form-label">Employment (Years)</label>
              <input type="number" name="employmentYears" className="form-input" value={formData.employmentYears} onChange={handleChange} required min="0" step="0.5" placeholder="e.g. 3" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: '1rem', fontSize: '1.05rem' }}>
              {loading ? 'Calculating...' : '⚡ Get Instant Estimate'}
            </button>
          </form>
          {error && <p style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>}
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="estimator-result-side"
            >
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="80%"
                    innerRadius="80%" outerRadius="100%"
                    barSize={15}
                    data={[{ value: result.riskScore, fill: gaugeColor }]}
                    startAngle={180} endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ textAlign: 'center', marginTop: '-40px' }}>
                <div style={{ fontSize: '3rem', fontWeight: '900', color: gaugeColor }}>{result.riskScore}</div>
                <div style={{ color: gaugeColor, fontWeight: 600, fontSize: '1.1rem' }}>{result.riskLevel} Risk</div>
              </div>

              <div className="estimator-stats">
                <div className="est-stat">
                  <Shield size={16} style={{ color: gaugeColor }} />
                  <span>{result.status}</span>
                </div>
                <div className="est-stat">
                  <DollarSign size={16} className="text-accent" />
                  <span>Est. Limit: ${result.estimatedLimit.toLocaleString()}</span>
                </div>
                <div className="est-stat">
                  <TrendingUp size={16} style={{ color: 'var(--warning)' }} />
                  <span>DTI: {(result.debtToIncomeRatio * 100).toFixed(0)}%</span>
                </div>
              </div>

              <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
                This is an estimate only. Sign up for a full AI-powered analysis.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreditEstimator;
