import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';
import { Settings, Users, FileText, Save, Download, Activity, AlertTriangle, ClipboardList, Wallet, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';

const STATUS_COLORS = { 'Approved': '#00ff87', 'Pending': '#ffb703', 'Rejected': '#ff0055' };
const RISK_COLORS = { 'Low': '#00ff87', 'Medium': '#ffb703', 'High': '#ff0055' };

const safeParseJSON = (jsonStr, fallback) => {
  if (!jsonStr) return fallback;
  if (typeof jsonStr === 'object') return jsonStr;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (inner) {}
    return fallback;
  }
};

const AdminDashboard = () => {
  const { addToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [stressResult, setStressResult] = useState(null);
  const [stressRules, setStressRules] = useState({ minIncome: 30000, maxDebtToIncomeRatio: 0.4, baseCreditLimit: 1000 });
  const [stressLoading, setStressLoading] = useState(false);
  const chartRef = useRef(null);

  // Expanded Row & Administrative Override States
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [statusOverride, setStatusOverride] = useState('');
  const [limitOverride, setLimitOverride] = useState(0);
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const handleExpand = (app) => {
    if (expandedAppId === app._id) {
      setExpandedAppId(null);
    } else {
      setExpandedAppId(app._id);
      setStatusOverride(app.status);
      setLimitOverride(app.creditLimit);
    }
  };

  const handleSaveOverride = async (appId) => {
    setSubmittingOverride(true);
    try {
      const { data } = await api.put(`/admin/applications/${appId}`, {
        status: statusOverride,
        creditLimit: Number(limitOverride)
      });
      addToast('Application override saved successfully!', 'success');
      setApplications(applications.map(app => app._id === appId ? { ...app, status: data.status, creditLimit: data.creditLimit } : app));
      setExpandedAppId(null);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save override', 'error');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const fetchData = async () => {
    try {
      const [appsRes, usersRes, rulesRes, productsRes] = await Promise.all([
        api.get('/admin/applications'), api.get('/admin/users'), api.get('/admin/rules'), api.get('/admin/loan-products')
      ]);
      setApplications(appsRes.data); setUsers(usersRes.data); setRules(rulesRes.data); setLoanProducts(productsRes.data);
      setStressRules({ minIncome: rulesRes.data.minIncome, maxDebtToIncomeRatio: rulesRes.data.maxDebtToIncomeRatio, baseCreditLimit: rulesRes.data.baseCreditLimit });
    } catch (error) { console.error('Error fetching admin data:', error); }
    finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    try { const { data } = await api.get('/admin/audit-logs'); setAuditLogs(data.logs || []); } catch(e) { console.error(e); }
  };
  
  const handleProductSave = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = {
        type: formData.get('type'),
        maxAmountFactor: Number(formData.get('maxAmountFactor')),
        baseInterestRate: Number(formData.get('baseInterestRate')),
        tenure: formData.get('tenure'),
        minRiskScore: Number(formData.get('minRiskScore')),
        minIncome: Number(formData.get('minIncome')),
        minEmploymentYears: Number(formData.get('minEmploymentYears')),
        isActive: formData.get('isActive') === 'on'
      };
      
      if (editingProduct) {
        await api.put(`/admin/loan-products/${editingProduct._id}`, data);
        addToast('Loan product updated!', 'success');
      } else {
        await api.post('/admin/loan-products', data);
        addToast('Loan product created!', 'success');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      const productsRes = await api.get('/admin/loan-products');
      setLoanProducts(productsRes.data);
    } catch (e) {
      addToast('Failed to save loan product.', 'error');
    }
  };

  const toggleProductActive = async (id) => {
    try {
      const { data } = await api.patch(`/admin/loan-products/${id}/toggle`);
      addToast(`Product is now ${data.isActive ? 'Active' : 'Inactive'}!`, 'success');
      setLoanProducts(loanProducts.map(p => p._id === id ? data : p));
    } catch (e) {
      addToast('Failed to change product status.', 'error');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/loan-products/${id}`);
      addToast('Product deleted!', 'success');
      setLoanProducts(loanProducts.filter(p => p._id !== id));
    } catch (e) {
      addToast('Failed to delete product.', 'error');
    }
  };

  const handleRuleChange = (e) => setRules({ ...rules, [e.target.name]: Number(e.target.value) });
  const handleStressChange = (e) => setStressRules({ ...stressRules, [e.target.name]: Number(e.target.value) });

  const saveRules = async () => {
    try { await api.put('/admin/rules', rules); addToast('Rules updated successfully!', 'success'); } catch(e) { addToast('Failed to update rules.', 'error'); }
  };

  const runStressTest = async () => {
    setStressLoading(true);
    try { const { data } = await api.post('/admin/stress-test', stressRules); setStressResult(data); addToast(`Stress test complete: ${data.statusChanges} status changes`, 'info'); } catch(e) { addToast('Stress test failed', 'error'); }
    finally { setStressLoading(false); }
  };

  const downloadMasterReport = async () => {
    const doc = new jsPDF('landscape');
    doc.setFillColor(10,10,10);doc.rect(0,0,297,30,'F');doc.setFontSize(20);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text("CredSetu - Predict Risk, Protect Trust.",14,20);
    doc.setFontSize(14);doc.setTextColor(59,130,246);doc.text("Master Application Audit Report",14,45);
    doc.setFontSize(10);doc.setTextColor(100,100,100);doc.setFont('helvetica','normal');doc.text(`Generated on: ${new Date().toLocaleDateString()}`,14,52);doc.text(`Total Records: ${applications.length} | Registered Users: ${users.length}`,14,57);
    doc.setDrawColor(200,200,200);doc.line(14,62,283,62);
    autoTable(doc, { startY: 68, head: [['Applicant','Income','Debt','Employment','Risk Score','Credit Limit','Status']], body: applications.map(app=>[app.user?.name||'Unknown',`$${app.income.toLocaleString()}`,`$${app.existingDebt.toLocaleString()}`,`${app.employmentYears} yrs`,`${app.riskScore} (${app.riskLevel})`,`$${app.creditLimit.toLocaleString()}`,app.status]), theme:'plain', headStyles:{fillColor:[240,240,240],textColor:[50,50,50],fontStyle:'bold'}, bodyStyles:{textColor:[80,80,80]}, alternateRowStyles:{fillColor:[250,250,250]} });
    const pageCount=doc.internal.getNumberOfPages();for(let i=1;i<=pageCount;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(150);doc.text(`CredSetu • Confidential • Page ${i} of ${pageCount}`,14,200);}
    doc.save(`Master_Credit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('Master report downloaded!', 'success');
  };

  const getChartData = () => {
    const counts = { Approved: 0, Pending: 0, Rejected: 0 };
    applications.forEach(app => { if (counts[app.status] !== undefined) counts[app.status]++; });
    return [{ name: 'Approved', count: counts.Approved },{ name: 'Pending', count: counts.Pending },{ name: 'Rejected', count: counts.Rejected }];
  };

  const getIncomeDistribution = () => {
    const brackets = { '<30k': 0, '30k-60k': 0, '60k-100k': 0, '100k+': 0 };
    applications.forEach(app => { if(app.income<30000)brackets['<30k']++;else if(app.income<60000)brackets['30k-60k']++;else if(app.income<100000)brackets['60k-100k']++;else brackets['100k+']++; });
    return Object.entries(brackets).map(([name,value])=>({name,value}));
  };

  const getRiskDistribution = () => {
    const dist = { Low: 0, Medium: 0, High: 0 };
    applications.forEach(app => { if(dist[app.riskLevel]!==undefined) dist[app.riskLevel]++; });
    return Object.entries(dist).map(([name,value])=>({name,value}));
  };

  if (loading) return <div className="text-center mt-6 fade-in">Loading admin panel...</div>;

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="fade-in">
      <motion.div variants={itemVariants} className="mb-6" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 style={{fontSize:'2.5rem',marginBottom:'0.5rem',textShadow:'0 0 20px rgba(255,255,255,0.3)'}}>Admin Dashboard</h1>
          <p className="text-muted">Manage applications, users, and risk engine rules.</p>
        </div>
        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
          {['applications','users','rules','loan-products','analytics','audit'].map(tab=>(
            <button key={tab} className={`btn ${activeTab===tab?'btn-primary':'btn-secondary'}`} onClick={()=>{setActiveTab(tab);if(tab==='audit')fetchAuditLogs();}}>
              {tab==='applications'&&<FileText size={16}/>}{tab==='users'&&<Users size={16}/>}{tab==='rules'&&<Settings size={16}/>}{tab==='loan-products'&&<Wallet size={16}/>}{tab==='analytics'&&<Activity size={16}/>}{tab==='audit'&&<ClipboardList size={16}/>}
              {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'applications' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="fade-in">
          <div className="grid grid-cols-2 mb-6">
            <motion.div variants={itemVariants}>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02}><div className="glass-card" ref={chartRef}>
                <h3 style={{marginBottom:'1rem',color:'var(--accent-primary)'}}>Status Distribution</h3>
                <div style={{width:'100%',height:250}}>
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={getChartData()}><XAxis dataKey="name" stroke="var(--text-muted)"/><YAxis stroke="var(--text-muted)" allowDecimals={false}/><RechartsTooltip cursor={{fill:'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor:'rgba(0,0,0,0.8)',border:'1px solid var(--accent-primary)',borderRadius:'8px'}}/><Bar dataKey="count" radius={[8,8,0,0]}>{getChartData().map((entry,index)=>(<Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]}/>))}</Bar></BarChart></ResponsiveContainer>
                </div>
              </div></Tilt>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02}><div className="glass-card" style={{display:'flex',flexDirection:'column',justifyContent:'center',height:'100%'}}>
                <h3 style={{marginBottom:'1rem',color:'var(--accent-secondary)'}}>Master Export</h3>
                <p className="text-muted mb-6" style={{fontSize:'1.1rem'}}>Download a complete PDF report of all applicants with risk scores and credit limits.</p>
                <button onClick={downloadMasterReport} className="btn btn-primary" style={{alignSelf:'flex-start',padding:'1rem 2rem'}}><Download size={20}/> Download Master PDF</button>
              </div></Tilt>
            </motion.div>
          </div>
          <motion.div variants={itemVariants} className="glass-card">
            <h3 style={{marginBottom:'1.5rem'}}>All Applications ({applications.length})</h3>
            <p className="text-muted" style={{ fontSize: '0.88rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
              💡 Click on any application row to expand detailed AI insights, matched loan packages, and apply custom overrides.
            </p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Income</th>
                    <th>Debt</th>
                    <th>Score</th>
                    <th>Limit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <React.Fragment key={app._id}>
                      <tr
                        onClick={() => handleExpand(app)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s', background: expandedAppId === app._id ? 'rgba(255, 255, 255, 0.05)' : '' }}
                        className="hover-row"
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {expandedAppId === app._id ? (
                              <ChevronUp size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            )}
                            <div>
                              <strong>{app.user?.name || 'Unknown'}</strong>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{app.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td>${app.income.toLocaleString()}</td>
                        <td>${app.existingDebt.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${app.riskLevel === 'Low' ? 'badge-success' : app.riskLevel === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                            {app.riskScore} ({app.riskLevel})
                          </span>
                        </td>
                        <td>${app.creditLimit.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${app.status === 'Approved' ? 'badge-success' : app.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>

                      {expandedAppId === app._id && (
                        <tr style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                          <td colSpan="6" style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                              
                              {/* Left Column: Financial Ratios */}
                              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem' }}>
                                <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  📊 Financial Profile
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Monthly Income:</span>
                                    <strong>${app.income.toLocaleString()}</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Outstanding Debt:</span>
                                    <strong>${app.existingDebt.toLocaleString()}</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Debt-to-Income (DTI):</span>
                                    <strong style={{ color: (app.existingDebt / (app.income || 1)) > 0.4 ? 'var(--danger)' : 'var(--success)' }}>
                                      {Math.round((app.existingDebt / (app.income || 1)) * 100)}%
                                    </strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Employment:</span>
                                    <strong>{app.employmentYears} years</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Self-Reported Score:</span>
                                    <strong>{app.creditScore || 'Not Estimated'}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Center Column: AI Risk Insight & Roadmap */}
                              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem' }}>
                                <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  🧠 AI Risk Insights
                                </h4>
                                {(() => {
                                  const advice = safeParseJSON(app.aiAdvice, { summary: app.aiAdvice });
                                  return (
                                    <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                                      <p className="text-muted" style={{ marginBottom: '0.75rem' }}>{advice.summary || 'No summary generated.'}</p>
                                      {advice.strengths && advice.strengths.length > 0 && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Strengths:</span>
                                          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.2rem', color: 'rgba(255,255,255,0.7)' }}>
                                            {advice.strengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {advice.weaknesses && advice.weaknesses.length > 0 && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Risks:</span>
                                          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.2rem', color: 'rgba(255,255,255,0.7)' }}>
                                            {advice.weaknesses.slice(0, 2).map((w, i) => <li key={i}>{w}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Right Column: AI Matchmaking Loans */}
                              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem' }}>
                                <h4 style={{ color: '#00f2fe', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  🤝 AI Loan Matches
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {app.aiRecommendationSummary && (
                                    <p className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>
                                      "{app.aiRecommendationSummary}"
                                    </p>
                                  )}
                                  {app.recommendedLoans && app.recommendedLoans.length > 0 ? (
                                    <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                      <table style={{ fontSize: '0.78rem', width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <th style={{ padding: '0.4rem', textAlign: 'left' }}>Product</th>
                                            <th style={{ padding: '0.4rem', textAlign: 'right' }}>Max Limit</th>
                                            <th style={{ padding: '0.4rem', textAlign: 'right' }}>EMI</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {app.recommendedLoans.map((loan, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < app.recommendedLoans.length - 1 ? '1px solid rgba(255,255,255,0.03)' : '' }}>
                                              <td style={{ padding: '0.4rem', color: '#00f2fe' }}>{loan.type}</td>
                                              <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600 }}>${loan.maxAmount.toLocaleString()}</td>
                                              <td style={{ padding: '0.4rem', textAlign: 'right', color: 'rgba(255,255,255,0.8)' }}>${loan.monthlyEMI}/mo</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>No matching loan products found.</p>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Bottom Administrative Control Panel */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.88rem' }}>Override Status:</label>
                                  <select
                                    className="form-input"
                                    style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', fontSize: '0.85rem', width: '130px', margin: 0 }}
                                    value={statusOverride}
                                    onChange={(e) => setStatusOverride(e.target.value)}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.88rem' }}>Credit Limit Override ($):</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: '120px', margin: 0 }}
                                    value={limitOverride}
                                    onChange={(e) => setLimitOverride(e.target.value)}
                                  />
                                </div>
                              </div>

                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem', margin: 0 }}
                                onClick={() => handleSaveOverride(app._id)}
                                disabled={submittingOverride}
                              >
                                {submittingOverride ? 'Saving...' : '💾 Apply Overrides'}
                              </button>
                            </div>

                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {applications.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">No applications found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div variants={itemVariants}><Tilt tiltMaxAngleX={2} tiltMaxAngleY={2} scale={1.01}><div className="glass-card fade-in">
          <h3 style={{marginBottom:'1.5rem'}}>Registered Users ({users.length})</h3>
          <div className="table-container"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>2FA</th><th>Joined</th></tr></thead>
          <tbody>{users.map(u=>(<tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td><span className={`badge ${u.role==='admin'?'badge-warning':'badge-success'}`}>{u.role}</span></td><td><span className={`badge ${u.is2FAEnabled?'badge-success':'badge-danger'}`}>{u.is2FAEnabled?'Enabled':'Disabled'}</span></td><td>{new Date(u.createdAt).toLocaleDateString()}</td></tr>))}</tbody></table></div>
        </div></Tilt></motion.div>
      )}

      {activeTab === 'rules' && rules && (
        <motion.div variants={itemVariants} className="grid grid-cols-2">
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02}><div className="glass-card fade-in">
            <h3 style={{marginBottom:'1.5rem',color:'var(--accent-primary)'}}>Risk Engine Configuration</h3>
            <p className="text-muted mb-6">These parameters dictate how the system calculates risk and assigns credit limits.</p>
            <div className="form-group"><label className="form-label">Minimum Income for High Score ($)</label><input type="number" name="minIncome" className="form-input" value={rules.minIncome} onChange={handleRuleChange}/></div>
            <div className="form-group"><label className="form-label">Maximum Debt-to-Income Ratio (0 to 1)</label><input type="number" name="maxDebtToIncomeRatio" className="form-input" value={rules.maxDebtToIncomeRatio} onChange={handleRuleChange} step="0.05" max="1"/></div>
            <div className="form-group"><label className="form-label">Base Credit Limit ($)</label><input type="number" name="baseCreditLimit" className="form-input" value={rules.baseCreditLimit} onChange={handleRuleChange}/></div>
            <button className="btn btn-primary mt-6 btn-block" onClick={saveRules} style={{padding:'1.25rem',fontSize:'1.2rem'}}><Save size={24}/> Save Rule Changes</button>
          </div></Tilt>

          <div className="glass-card fade-in" style={{borderLeft:'4px solid var(--warning)'}}>
            <h3 style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1rem',color:'var(--warning)'}}><AlertTriangle size={22}/> Stress Tester</h3>
            <p className="text-muted mb-4" style={{fontSize:'0.9rem'}}>Simulate hypothetical rule changes to see impact on all current applications without saving.</p>
            <div className="form-group"><label className="form-label">Test Min Income</label><input type="number" name="minIncome" className="form-input" value={stressRules.minIncome} onChange={handleStressChange}/></div>
            <div className="form-group"><label className="form-label">Test Max DTI Ratio</label><input type="number" name="maxDebtToIncomeRatio" className="form-input" value={stressRules.maxDebtToIncomeRatio} onChange={handleStressChange} step="0.05" max="1"/></div>
            <div className="form-group"><label className="form-label">Test Base Credit Limit</label><input type="number" name="baseCreditLimit" className="form-input" value={stressRules.baseCreditLimit} onChange={handleStressChange}/></div>
            <button className="btn btn-secondary btn-block" onClick={runStressTest} disabled={stressLoading} style={{padding:'1rem'}}>{stressLoading ? 'Running...' : '🔬 Run Stress Test'}</button>
            {stressResult && (
              <div style={{marginTop:'1.5rem',padding:'1.5rem',background:'rgba(255,183,3,0.08)',border:'1px solid rgba(255,183,3,0.2)',borderRadius:'10px'}}>
                <div style={{fontWeight:700,marginBottom:'0.75rem',color:'var(--warning)'}}>Impact Analysis</div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',fontSize:'0.9rem'}}>
                  <div>Total Applications: <strong>{stressResult.totalApplications}</strong></div>
                  <div>Would Approve: <strong style={{color:'var(--success)'}}>{stressResult.wouldApprove}</strong></div>
                  <div>Would Reject: <strong style={{color:'var(--danger)'}}>{stressResult.wouldReject}</strong></div>
                  <div style={{color:'var(--warning)',fontWeight:700}}>Status Changes: {stressResult.statusChanges}</div>
                </div>
                {stressResult.changedApplications?.length > 0 && (
                  <div style={{marginTop:'1rem',maxHeight:'150px',overflowY:'auto'}}>
                    {stressResult.changedApplications.map((c,i)=>(
                      <div key={i} style={{padding:'0.5rem',borderBottom:'1px solid var(--border-color)',fontSize:'0.8rem',display:'flex',justifyContent:'space-between'}}>
                        <span>{c.userName}</span>
                        <span><span className={`badge ${c.currentStatus==='Approved'?'badge-success':'badge-danger'}`}>{c.currentStatus}</span> → <span className={`badge ${c.newStatus==='Approved'?'badge-success':'badge-danger'}`}>{c.newStatus}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {activeTab === 'loan-products' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="fade-in">
          <div className="glass-card mb-6" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <h3 style={{color:'var(--accent-primary)',marginBottom:'0.5rem'}}>Loan Products</h3>
              <p className="text-muted">Manage the loan products available for AI recommendation based on user risk profiles.</p>
            </div>
            <button className="btn btn-primary" onClick={()=>{setEditingProduct(null);setShowProductModal(true);}}><Plus size={18}/> Add Product</button>
          </div>
          
          <div className="grid grid-cols-2">
            {loanProducts.map(product => (
              <Tilt key={product._id} tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02}>
                <div className="glass-card" style={!product.isActive ? { borderLeft: '4px solid var(--danger)', opacity: 0.8 } : {}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                    <div>
                      <h4 style={{fontSize:'1.25rem',fontWeight:700,display:'flex',alignItems:'center',gap:'0.5rem'}}><Wallet className="text-accent"/> {product.type}</h4>
                      <span
                        className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}
                        style={{ marginTop: '0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => toggleProductActive(product._id)}
                        title="Click to toggle active status"
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>{setEditingProduct(product);setShowProductModal(true);}}><Edit2 size={16}/></button>
                      <button className="btn btn-sm" style={{background:'rgba(255,0,85,0.2)',color:'var(--danger)',border:'none'}} onClick={()=>deleteProduct(product._id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4" style={{fontSize:'0.9rem'}}>
                    <div><span className="text-muted block">Min Risk Score</span><strong>{product.minRiskScore}</strong></div>
                    <div><span className="text-muted block">Min Income</span><strong>${product.minIncome.toLocaleString()}</strong></div>
                    <div><span className="text-muted block">Base Rate</span><strong>{product.baseInterestRate}%</strong></div>
                    <div><span className="text-muted block">Max Amount</span><strong>{product.maxAmountFactor}x Income</strong></div>
                    <div><span className="text-muted block">Tenure</span><strong>{product.tenure}</strong></div>
                    <div><span className="text-muted block">Min Experience</span><strong>{product.minEmploymentYears} years</strong></div>
                  </div>
                </div>
              </Tilt>
            ))}
          </div>
          {loanProducts.length === 0 && <div className="text-center text-muted p-8">No loan products found. Create one to enable recommendations.</div>}
          
          {showProductModal && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
              <div className="glass-card" style={{width:'90%',maxWidth:'600px',maxHeight:'90vh',overflowY:'auto'}}>
                <h3 style={{marginBottom:'1.5rem'}}>{editingProduct ? 'Edit Loan Product' : 'Add Loan Product'}</h3>
                <form onSubmit={handleProductSave}>
                  <div className="form-group"><label className="form-label">Product Name / Type</label><input type="text" name="type" className="form-input" defaultValue={editingProduct?.type} required placeholder="e.g. Premium Auto Loan" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group"><label className="form-label">Min Risk Score (0-100)</label><input type="number" name="minRiskScore" className="form-input" defaultValue={editingProduct?.minRiskScore} required /></div>
                    <div className="form-group"><label className="form-label">Min Income ($)</label><input type="number" name="minIncome" className="form-input" defaultValue={editingProduct?.minIncome} required /></div>
                    <div className="form-group"><label className="form-label">Base Interest Rate (%)</label><input type="number" name="baseInterestRate" className="form-input" defaultValue={editingProduct?.baseInterestRate} step="0.1" required /></div>
                    <div className="form-group"><label className="form-label">Max Amount (Multiplier)</label><input type="number" name="maxAmountFactor" className="form-input" defaultValue={editingProduct?.maxAmountFactor} step="0.1" required placeholder="e.g. 0.5 (half of income)" /></div>
                    <div className="form-group"><label className="form-label">Tenure (Text)</label><input type="text" name="tenure" className="form-input" defaultValue={editingProduct?.tenure} required placeholder="e.g. 12-60 months" /></div>
                    <div className="form-group"><label className="form-label">Min Employment (Years)</label><input type="number" name="minEmploymentYears" className="form-input" defaultValue={editingProduct?.minEmploymentYears || 0} step="0.5" required /></div>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      defaultChecked={editingProduct ? editingProduct.isActive : true}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Active (Recommend this product to eligible users)</label>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:'1rem',marginTop:'2rem'}}>
                    <button type="button" className="btn btn-secondary" onClick={()=>setShowProductModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><Save size={18}/> Save Product</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'analytics' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <div className="grid grid-cols-2 mb-6">
            <motion.div variants={itemVariants}><div className="glass-card">
              <h3 style={{marginBottom:'1rem',color:'var(--accent-primary)'}}>Income Distribution</h3>
              <div style={{width:'100%',height:250}}>
                <ResponsiveContainer width="100%" height="100%"><BarChart data={getIncomeDistribution()}><XAxis dataKey="name" stroke="var(--text-muted)"/><YAxis stroke="var(--text-muted)" allowDecimals={false}/><RechartsTooltip contentStyle={{backgroundColor:'rgba(0,0,0,0.8)',border:'1px solid var(--accent-primary)',borderRadius:'8px'}}/><Bar dataKey="value" fill="#4facfe" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>
              </div>
            </div></motion.div>
            <motion.div variants={itemVariants}><div className="glass-card">
              <h3 style={{marginBottom:'1rem',color:'var(--accent-secondary)'}}>Risk Level Distribution</h3>
              <div style={{width:'100%',height:250}}>
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getRiskDistribution()} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">{getRiskDistribution().map((entry,i)=>(<Cell key={i} fill={RISK_COLORS[entry.name]||'#888'}/>))}</Pie><RechartsTooltip contentStyle={{backgroundColor:'rgba(0,0,0,0.8)',border:'1px solid var(--accent-primary)',borderRadius:'8px'}}/></PieChart></ResponsiveContainer>
              </div>
              <div style={{display:'flex',justifyContent:'center',gap:'1.5rem',marginTop:'0.5rem'}}>
                {Object.entries(RISK_COLORS).map(([k,v])=>(<span key={k} style={{fontSize:'0.8rem',fontWeight:'bold'}}><span style={{color:v,fontSize:'1.2rem'}}>●</span> {k}</span>))}
              </div>
            </div></motion.div>
          </div>
        </motion.div>
      )}

      {activeTab === 'audit' && (
        <motion.div variants={itemVariants}><div className="glass-card fade-in">
          <h3 style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><ClipboardList size={22}/> Audit Logs</h3>
          <div className="table-container"><table><thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Time</th></tr></thead>
          <tbody>{auditLogs.map((log,i)=>(<tr key={i}><td>{log.admin?.name||'System'}</td><td><span className="badge badge-warning">{log.action}</span></td><td>{log.target}</td><td>{new Date(log.createdAt).toLocaleString()}</td></tr>))}
          {auditLogs.length===0&&<tr><td colSpan="4" className="text-center text-muted">No audit logs yet. Actions will appear here when admins make changes.</td></tr>}</tbody></table></div>
        </div></motion.div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
