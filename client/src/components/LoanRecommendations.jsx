import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet, Home, Car, GraduationCap, Briefcase, GitMerge, Sparkles, ChevronDown, ChevronUp, Star, Percent, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = {
  wallet: <Wallet size={24} />,
  home: <Home size={24} />,
  car: <Car size={24} />,
  graduation: <GraduationCap size={24} />,
  briefcase: <Briefcase size={24} />,
  merge: <GitMerge size={24} />
};

const ELIGIBILITY_COLORS = {
  high: { bg: 'rgba(0,255,135,0.1)', border: 'rgba(0,255,135,0.3)', text: '#00ff87', label: 'Highly Eligible' },
  medium: { bg: 'rgba(255,183,3,0.1)', border: 'rgba(255,183,3,0.3)', text: '#ffb703', label: 'Eligible' },
  low: { bg: 'rgba(255,0,85,0.1)', border: 'rgba(255,0,85,0.3)', text: '#ff0055', label: 'Limited' }
};

const LoanRecommendations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const { data } = await api.get('/applications/recommendations');
      setData(data);
    } catch (e) {
      // No application yet
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data || !data.recommendations?.length) return null;

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-tertiary)', marginBottom: '0.5rem' }}>
            <Sparkles size={22} /> Personalized Loan Recommendations
          </h3>
          <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '600px' }}>
            {data.summary}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Eligible</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            ${data.totalEligibleAmount?.toLocaleString()}
          </span>
        </div>
      </div>

      {data.bestMatch && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <Star size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>Best match for your profile: <strong style={{ color: 'var(--accent-primary)' }}>{data.bestMatch}</strong></span>
        </div>
      )}

      <div className="loan-rec-grid">
        {data.recommendations.map((rec, index) => {
          const isExpanded = expandedCard === index;
          const eligStyle = ELIGIBILITY_COLORS[rec.eligibility] || ELIGIBILITY_COLORS.medium;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="loan-rec-card"
              style={{ borderColor: eligStyle.border }}
            >
              <div className="loan-rec-header" onClick={() => setExpandedCard(isExpanded ? null : index)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="loan-rec-icon" style={{ background: eligStyle.bg, color: eligStyle.text }}>
                    {ICONS[rec.icon] || <Wallet size={24} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rec.type}</div>
                    <span className="loan-eligibility-badge" style={{ background: eligStyle.bg, color: eligStyle.text, border: `1px solid ${eligStyle.border}` }}>
                      {eligStyle.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ${rec.maxAmount?.toLocaleString()}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Max Amount</div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="loan-rec-details">
                      <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                        {rec.reason}
                      </p>

                      <div className="loan-rec-stats">
                        <div className="loan-stat-item">
                          <Percent size={14} style={{ color: 'var(--accent-primary)' }} />
                          <div>
                            <div className="loan-stat-label">Interest Rate</div>
                            <div className="loan-stat-value">{rec.interestRate}% p.a.</div>
                          </div>
                        </div>
                        <div className="loan-stat-item">
                          <DollarSign size={14} style={{ color: 'var(--success)' }} />
                          <div>
                            <div className="loan-stat-label">Est. EMI</div>
                            <div className="loan-stat-value">${rec.monthlyEMI?.toLocaleString()}/mo</div>
                          </div>
                        </div>
                        <div className="loan-stat-item">
                          <Clock size={14} style={{ color: 'var(--warning)' }} />
                          <div>
                            <div className="loan-stat-label">Tenure</div>
                            <div className="loan-stat-value">{rec.tenure}</div>
                          </div>
                        </div>
                      </div>

                      {rec.features?.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>Key Features</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {rec.features.map((f, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <CheckCircle size={14} style={{ color: eligStyle.text, flexShrink: 0 }} /> {f}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanRecommendations;
