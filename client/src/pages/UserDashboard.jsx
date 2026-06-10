import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import api from '../services/api';
import { Send, Sparkles, AlertCircle, CheckCircle, Clock, Download, ThumbsUp, ThumbsDown, Map, TrendingUp, HelpCircle, Loader } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, RadialBarChart, RadialBar, PolarAngleAxis, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';
import MilestoneTracker from '../components/MilestoneTracker';
import LoanSimulator from '../components/LoanSimulator';
import DocumentUpload from '../components/DocumentUpload';
import LoanRecommendations from '../components/LoanRecommendations';

const COLORS = ['#00f2fe', '#f093fb', '#ef4444', '#f59e0b'];

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

const UserDashboard = () => {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [pathData, setPathData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const chartRef = useRef(null);
  const [formData, setFormData] = useState({ income: '', existingDebt: '', employmentYears: '', creditScore: '' });
  const [submitError, setSubmitError] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [creditScoreUnknown, setCreditScoreUnknown] = useState(false);
  const [scoreEstimated, setScoreEstimated] = useState(false);

  useEffect(() => { fetchApplication(); fetchHistory(); }, []);

  useEffect(() => {
    if (creditScoreUnknown) {
      const { income, existingDebt, employmentYears } = formData;
      if (income && existingDebt && employmentYears) {
        const delayDebounce = setTimeout(() => {
          estimateCreditScore(true);
        }, 600);
        return () => clearTimeout(delayDebounce);
      }
    }
  }, [formData.income, formData.existingDebt, formData.employmentYears, creditScoreUnknown]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/applications/history');
      setHistoryData(data.map((h, i) => ({ ...h, label: `v${i + 1}` })));
    } catch(e) {}
  };

  const fetchApplication = async () => {
    try {
      const { data } = await api.get('/applications/me');
      setApplication(data);
      if (data.aiAdvice) {
        setAiData(safeParseJSON(data.aiAdvice, { summary: data.aiAdvice, strengths: [], weaknesses: [], recommendation: '' }));
      }
      if (data.pathToApproval) {
        setPathData(safeParseJSON(data.pathToApproval, null));
      }
    } catch (error) {
      if (error.response?.status !== 404) console.error('Error fetching application:', error);
    } finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleDocData = (extracted) => {
    setFormData(prev => ({
      ...prev,
      income: extracted.income || prev.income,
      existingDebt: extracted.existingDebt || prev.existingDebt,
      employmentYears: extracted.employmentYears || prev.employmentYears
    }));
    addToast('Form auto-filled from document!', 'success');
  };

  const estimateCreditScore = async (silent = false) => {
    if (!formData.income || !formData.existingDebt || !formData.employmentYears) {
      if (!silent) addToast('Please enter income, debt, and employment first.', 'warning');
      return;
    }
    setEstimating(true);
    try {
      const { data } = await api.post('/applications/estimate', {
        income: Number(formData.income),
        existingDebt: Number(formData.existingDebt),
        employmentYears: Number(formData.employmentYears)
      });
      const estimatedScore = Math.min(850, Math.max(300, Math.round(300 + (data.riskScore * 5.5))));
      setFormData(prev => ({ ...prev, creditScore: estimatedScore }));
      setScoreEstimated(true);
      if (!silent) addToast(`Estimated Score: ~${estimatedScore} (Risk Score: ${data.riskScore}/100)`, 'success');
    } catch (e) {
      if (!silent) addToast('Failed to estimate credit score', 'error');
    } finally {
      setEstimating(false);
    }
  };

  const handleCreditScoreUnknownToggle = async (checked) => {
    setCreditScoreUnknown(checked);
    setScoreEstimated(false);
    if (checked) {
      setFormData(prev => ({ ...prev, creditScore: '' }));
      // Auto-estimate if we already have the other fields
      if (formData.income && formData.existingDebt && formData.employmentYears) {
        await estimateCreditScore(true);
      } else {
        addToast('Fill in income, debt & employment — score will auto-estimate.', 'info');
      }
    } else {
      setFormData(prev => ({ ...prev, creditScore: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitError('');
    try {
      const { data } = await api.post('/applications', {
        income: Number(formData.income), existingDebt: Number(formData.existingDebt),
        employmentYears: Number(formData.employmentYears), creditScore: Number(formData.creditScore) || 0
      });
      setApplication(data); setIsEditing(false);
      addToast(`Application ${data.status}! Credit Limit: $${data.creditLimit.toLocaleString()}`, data.status === 'Approved' ? 'success' : 'warning');
      if (data.aiAdvice) { setAiData(safeParseJSON(data.aiAdvice, { summary: data.aiAdvice, strengths: [], weaknesses: [], recommendation: '' })); }
      if (data.pathToApproval) { setPathData(safeParseJSON(data.pathToApproval, null)); }
      fetchHistory();
    } catch (error) { setSubmitError(error.response?.data?.message || 'Failed to submit'); addToast('Submission failed', 'error'); }
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Page 1: Premium Title Block & Executive Financial Summary
    doc.setFillColor(10, 10, 10); 
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(22); 
    doc.setTextColor(255, 255, 255); 
    doc.setFont('helvetica', 'bold');
    doc.text("CredSetu", 14, 21);
    doc.setFontSize(10);
    doc.setTextColor(170, 170, 170);
    doc.setFont('helvetica', 'normal');
    doc.text("Predict Risk, Protect Trust.", 48, 20);

    doc.setFontSize(14); 
    doc.setTextColor(59, 130, 246); 
    doc.setFont('helvetica', 'bold');
    doc.text("Executive Credit Analysis Report", 14, 45);
    
    doc.setFontSize(10); 
    doc.setTextColor(100, 100, 100); 
    doc.setFont('helvetica', 'normal');
    doc.text(`Applicant Name:  ${user.name}`, 14, 53);
    doc.text(`Email Address:   ${user.email}`, 14, 58);
    doc.text(`Report Date:     ${new Date().toLocaleDateString()}`, 14, 63);
    doc.setDrawColor(200, 200, 200); 
    doc.line(14, 67, 196, 67);

    // Financial Profile Table
    autoTable(doc, {
      startY: 72, 
      head: [['Financial Metric', 'Evaluated Value']],
      body: [
        ['Assigned Status', application.status],
        ['Risk Evaluation Level', `${application.riskLevel} Risk`],
        ['Risk Score', `${application.riskScore} / 100`],
        ['Assigned Credit Limit', `$${application.creditLimit.toLocaleString()}`],
        ['Annual Base Income', `$${application.income.toLocaleString()}`],
        ['Total Outstanding Debt', `$${application.existingDebt.toLocaleString()}`],
        ['Debt-To-Income (DTI) Ratio', `${Math.round((application.existingDebt / (application.income || 1)) * 100)}%`],
        ['Employment Tenure', `${application.employmentYears} Years`]
      ],
      theme: 'striped', 
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    let nextY = doc.lastAutoTable.finalY + 15;

    // Visual Analytics Chart (If present)
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        if (nextY + 80 > 280) {
          doc.addPage();
          nextY = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'bold');
        doc.text("Visual Asset Ratios (Income vs Debt)", 14, nextY);
        doc.line(14, nextY + 2, 196, nextY + 2);
        doc.addImage(imgData, 'PNG', 25, nextY + 8, 160, 65);
        nextY += 85;
      } catch (e) {
        console.error("PDF Chart Render Error:", e);
      }
    }

    // Page 2: AI Risk Intelligence & Detailed Financial Analysis
    doc.addPage();
    nextY = 20;

    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.text("AI Risk Intelligence & Decision Insight", 14, nextY);
    doc.line(14, nextY + 2, 196, nextY + 2);
    nextY += 12;

    if (aiData) {
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      
      // Multi-paragraph risk summary
      const summaryLines = doc.splitTextToSize(aiData.summary || '', 180);
      doc.text(summaryLines, 14, nextY);
      nextY += summaryLines.length * 5 + 8;

      // Key Strengths
      if (aiData.strengths && aiData.strengths.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'bold');
        doc.text("✓ Primary Credit Strengths", 14, nextY);
        nextY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        aiData.strengths.forEach((strength) => {
          doc.text(`• ${strength}`, 18, nextY);
          nextY += 5;
        });
        nextY += 4;
      }

      // Identified Risks
      if (aiData.weaknesses && aiData.weaknesses.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(239, 68, 68);
        doc.setFont('helvetica', 'bold');
        doc.text("⚠ Identified Risk Factors", 14, nextY);
        nextY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        aiData.weaknesses.forEach((weakness) => {
          doc.text(`• ${weakness}`, 18, nextY);
          nextY += 5;
        });
        nextY += 4;
      }

      // Recommendation
      if (aiData.recommendation) {
        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'bold');
        doc.text("⭐ Actionable Recommendation Advice", 14, nextY);
        nextY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        const recLines = doc.splitTextToSize(aiData.recommendation, 180);
        doc.text(recLines, 14, nextY);
        nextY += recLines.length * 5 + 8;
      }
    }

    // Page 3: AI Loan Recommendation Report & Matched Products List
    doc.addPage();
    nextY = 20;

    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.text("AI Loan Recommendation Analysis Report", 14, nextY);
    doc.line(14, nextY + 2, 196, nextY + 2);
    nextY += 12;

    if (application.aiRecommendationSummary) {
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      doc.setFont('helvetica', 'normal');
      const recSummaryLines = doc.splitTextToSize(application.aiRecommendationSummary, 180);
      doc.text(recSummaryLines, 14, nextY);
      nextY += recSummaryLines.length * 5.5 + 10;
    }

    // Table of Matched Loan Packages
    if (application.recommendedLoans && application.recommendedLoans.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      doc.setFont('helvetica', 'bold');
      doc.text("💼 Eligible Matched Loan Packages", 14, nextY);
      nextY += 6;

      const loanRows = application.recommendedLoans.map((loan) => [
        loan.type,
        `$${loan.maxAmount.toLocaleString()}`,
        `${loan.interestRate}%`,
        loan.tenure,
        `$${loan.monthlyEMI.toLocaleString()} / mo`,
        loan.eligibility.toUpperCase()
      ]);

      autoTable(doc, {
        startY: nextY,
        head: [['Loan Product', 'Max Amount Limit', 'Base Interest Rate', 'Repayment Tenure', 'Estimated EMI', 'Match Rating']],
        body: loanRows,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 9 },
        alternateRowStyles: { fillColor: [253, 244, 255] }
      });

      nextY = doc.lastAutoTable.finalY + 15;
    }

    // Path to Approval Steps
    if (pathData && pathData.steps && pathData.steps.length > 0) {
      if (nextY + 60 > 280) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.setFont('helvetica', 'bold');
      doc.text("📈 Path to Approval Roadmap", 14, nextY);
      doc.line(14, nextY + 2, 196, nextY + 2);
      nextY += 10;

      if (pathData.overallMessage) {
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'italic');
        doc.text(`"${pathData.overallMessage}"`, 14, nextY);
        nextY += 8;
      }

      pathData.steps.forEach((step, idx) => {
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${step.title} [Impact: ${step.impact.toUpperCase()}]`, 14, nextY);
        nextY += 5;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(step.description, 175);
        doc.text(descLines, 18, nextY);
        nextY += descLines.length * 4.5;
        if (step.targetValue) {
          doc.setFontSize(8.5);
          doc.setTextColor(34, 197, 94);
          doc.setFont('helvetica', 'bold');
          doc.text(`Target Metric Target: ${step.targetValue}`, 18, nextY);
          nextY += 5;
        }
        nextY += 4;
      });
    }

    // Add unified footers to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`CredSetu Credit Intelligence System • Page ${i} of ${pageCount}`, 14, 287);
      doc.text("Confidential financial report generated automatically by AI risk advisory models.", 115, 291);
    }

    doc.save(`${user.name.replace(/\s+/g, '_')}_Detailed_Credit_Report.pdf`);
    addToast('Comprehensive Executive PDF report downloaded!', 'success');
  };

  if (loading) return <div className="text-center mt-6 fade-in">Loading dashboard...</div>;

  const chartData = application ? [{ name: 'Income', value: application.income }, { name: 'Existing Debt', value: application.existingDebt }] : [];
  const gaugeData = application ? [{ name: 'Risk Score', value: application.riskScore, fill: application.riskScore >= 70 ? '#00ff87' : application.riskScore >= 40 ? '#ffb703' : '#ff0055' }] : [];
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  const itemVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="fade-in">
      <motion.div variants={itemVariants} className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>Welcome, {user.name}</h1>
          <p className="text-muted">Manage your credit profile and view insights.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={14} /> Verified Account
          </div>
          {application && (
            <button onClick={downloadPDF} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              <Download size={18} /> Download Report
            </button>
          )}
        </div>
      </motion.div>

      {application && <motion.div variants={itemVariants} className="mb-6"><MilestoneTracker status={application.status} /></motion.div>}

      {application && !isEditing ? (
        <>
          <motion.div variants={itemVariants} className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="grid grid-cols-2">
                <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05} transitionSpeed={2500} className="stat-card" style={{height:'100%'}}>
                  <div className={application.status==='Approved'?'success':application.status==='Rejected'?'danger':'warning'}>
                    <span className="stat-label">Credit Limit Assigned</span>
                    <span className="stat-value" style={{fontSize:'3rem'}}>${application.creditLimit.toLocaleString()}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'0.5rem'}}>
                      {application.status==='Approved'&&<CheckCircle className="text-success" size={24}/>}
                      {application.status==='Rejected'&&<AlertCircle className="text-danger" size={24}/>}
                      {application.status==='Pending'&&<Clock className="text-warning" size={24}/>}
                      <span className={application.status==='Approved'?'text-success':application.status==='Rejected'?'text-danger':'text-warning'} style={{fontWeight:'bold'}}>Status: {application.status}</span>
                    </div>
                  </div>
                </Tilt>
                <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05} transitionSpeed={2500} className="glass-card" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1.5rem',height:'100%'}}>
                  <span className="stat-label mb-2">Risk Score Meter</span>
                  <div style={{width:'100%',height:160}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="80%" innerRadius="80%" outerRadius="100%" barSize={15} data={gaugeData} startAngle={180} endAngle={0}>
                        <PolarAngleAxis type="number" domain={[0,100]} angleAxisId={0} tick={false}/>
                        <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10}/>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{marginTop:'-40px',textAlign:'center'}}>
                    <div style={{fontSize:'2.5rem',fontWeight:'900',textShadow:'0 0 10px rgba(255,255,255,0.5)'}}>{application.riskScore}</div>
                    <div className="text-accent" style={{fontWeight:'bold'}}>{application.riskLevel} Risk Level</div>
                  </div>
                </Tilt>
              </div>

              {aiData && (
                <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2500}>
                  <div className="glass-card fade-in" style={{borderLeft:'4px solid var(--accent-secondary)'}}>
                    <h3 style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1rem',color:'var(--accent-secondary)'}}><Sparkles/> AI Risk Analysis</h3>
                    <p style={{fontSize:'1.1rem',marginBottom:'1.5rem',lineHeight:'1.6'}}>{aiData.summary}</p>
                    <div className="grid grid-cols-2">
                      <div className="insight-section">
                        <div className="insight-title text-success" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><ThumbsUp size={18}/> Strengths</div>
                        <ul className="insight-list">{aiData.strengths?.map((s,i)=>(<li key={i}><CheckCircle size={16} className="text-success mt-1"/> {s}</li>))}</ul>
                      </div>
                      <div className="insight-section">
                        <div className="insight-title text-danger" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><ThumbsDown size={18}/> Areas for Improvement</div>
                        <ul className="insight-list">{aiData.weaknesses?.map((w,i)=>(<li key={i}><AlertCircle size={16} className="text-danger mt-1"/> {w}</li>))}</ul>
                      </div>
                    </div>
                    {aiData.recommendation && (<div style={{marginTop:'1.5rem',padding:'1.5rem',background:'rgba(0,242,254,0.1)',borderRadius:'var(--radius-md)',border:'1px solid rgba(0,242,254,0.3)'}}><strong>Recommendation:</strong> {aiData.recommendation}</div>)}
                  </div>
                </Tilt>
              )}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.02} transitionSpeed={2500}>
                <div className="glass-card" ref={chartRef}>
                  <h3 style={{marginBottom:'1rem',color:'var(--accent-primary)'}}>Income vs Debt</h3>
                  <div style={{width:'100%',height:220}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">{chartData.map((entry,index)=>(<Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]}/>))}</Pie><RechartsTooltip formatter={(value)=>`$${value.toLocaleString()}`} contentStyle={{backgroundColor:'rgba(0,0,0,0.8)',border:'1px solid var(--accent-primary)',borderRadius:'8px'}}/></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{display:'flex',justifyContent:'center',gap:'1.5rem'}}>
                    <span style={{fontSize:'0.875rem',fontWeight:'bold'}}><span style={{color:COLORS[0],fontSize:'1.2rem'}}>●</span> Income</span>
                    <span style={{fontSize:'0.875rem',fontWeight:'bold'}}><span style={{color:COLORS[1],fontSize:'1.2rem'}}>●</span> Debt</span>
                  </div>
                </div>
              </Tilt>
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.02} transitionSpeed={2500}>
                <div className="glass-card">
                  <h3 style={{marginBottom:'1.5rem'}}>Submitted Data</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                    {[['Annual Income',`$${application.income.toLocaleString()}`],['Existing Debt',`$${application.existingDebt.toLocaleString()}`],['Employment Length',`${application.employmentYears} years`],['Declared Score',application.creditScore>0?application.creditScore:'N/A']].map(([l,v],i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',paddingBottom:'0.75rem',borderBottom:'1px solid var(--border-color)'}}><span className="text-muted" style={{fontWeight:'bold'}}>{l}</span><span style={{fontWeight:'bold'}}>{v}</span></div>
                    ))}
                  </div>
                  <button onClick={()=>{setFormData({income:application.income,existingDebt:application.existingDebt,employmentYears:application.employmentYears,creditScore:application.creditScore||''});setIsEditing(true);}} className="btn btn-secondary mt-6" style={{width:'100%',padding:'0.75rem'}}>Edit Details</button>
                </div>
              </Tilt>
            </div>
          </motion.div>

          {/* Path to Approval */}
          {pathData && pathData.steps?.length > 0 && (
            <motion.div variants={itemVariants} style={{marginTop:'2rem'}}>
              <div className="glass-card" style={{borderLeft:'4px solid var(--success)'}}>
                <h3 style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem',color:'var(--success)'}}><Map size={22}/> Path to Approval Roadmap</h3>
                <p className="text-muted mb-6">{pathData.overallMessage}</p>
                <div className="grid grid-cols-2" style={{gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))'}}>
                  {pathData.steps.map((step,i)=>(
                    <div key={i} className="insight-section" style={{borderLeft:`3px solid ${step.impact==='high'?'var(--danger)':step.impact==='medium'?'var(--warning)':'var(--success)'}`}}>
                      <div style={{fontWeight:700,marginBottom:'0.5rem',fontSize:'0.95rem'}}>{step.title}</div>
                      <p className="text-muted" style={{fontSize:'0.85rem',lineHeight:1.5,marginBottom:'0.5rem'}}>{step.description}</p>
                      {step.targetValue && <span className="badge badge-success">Target: {step.targetValue}</span>}
                    </div>
                  ))}
                </div>
                {pathData.estimatedImprovement && <div style={{marginTop:'1rem',padding:'1rem',background:'rgba(0,255,135,0.08)',borderRadius:'8px',textAlign:'center',fontWeight:600,color:'var(--success)'}}>Estimated Improvement: {pathData.estimatedImprovement}</div>}
              </div>
            </motion.div>
          )}

          {/* Loan Recommendations */}
          <motion.div variants={itemVariants} style={{marginTop:'2rem'}}>
            <LoanRecommendations />
          </motion.div>

          {/* Loan Simulator + Trend Analysis */}
          <motion.div variants={itemVariants} className="grid grid-cols-2" style={{marginTop:'2rem'}}>
            <LoanSimulator />
            {historyData.length > 1 && (
              <div className="glass-card" style={{borderLeft:'4px solid var(--warning)'}}>
                <h3 style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1rem',color:'var(--warning)'}}><TrendingUp size={22}/> Credit Health Trend</h3>
                <div style={{width:'100%',height:250}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                      <XAxis dataKey="label" stroke="var(--text-muted)"/>
                      <YAxis stroke="var(--text-muted)"/>
                      <RechartsTooltip contentStyle={{backgroundColor:'rgba(0,0,0,0.8)',border:'1px solid var(--accent-primary)',borderRadius:'8px'}}/>
                      <Line type="monotone" dataKey="riskScore" stroke="#00f2fe" strokeWidth={2} dot={{fill:'#00f2fe'}} name="Risk Score"/>
                      <Line type="monotone" dataKey="creditLimit" stroke="#f093fb" strokeWidth={2} dot={{fill:'#f093fb'}} name="Credit Limit" yAxisId={0}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-2">
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2500}>
            <div className="glass-card" style={{maxWidth:'600px'}}>
              <h2 style={{marginBottom:'1.5rem',color:'var(--accent-primary)'}}>{isEditing ? 'Edit Your Details' : 'Apply for Credit'}</h2>
              <p className="text-muted mb-6">{isEditing ? 'Update your information to recalculate your risk score.' : 'Fill out the form below to get an instant credit decision powered by our AI risk engine.'}</p>
              {submitError && <div className="badge badge-danger mb-4 text-center" style={{width:'100%',padding:'1rem',fontSize:'1rem'}}>{submitError}</div>}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2">
                  <div className="form-group"><label className="form-label">Annual Income ($)</label><input type="number" name="income" className="form-input" value={formData.income} onChange={handleChange} required min="0"/></div>
                  <div className="form-group"><label className="form-label">Existing Debt ($)</label><input type="number" name="existingDebt" className="form-input" value={formData.existingDebt} onChange={handleChange} required min="0"/></div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="form-group"><label className="form-label">Employment Length (Years)</label><input type="number" name="employmentYears" className="form-input" value={formData.employmentYears} onChange={handleChange} required min="0" step="0.5"/></div>
                  <div className="form-group">
                    <label className="form-label">Credit Score</label>
                    {/* I don't know checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={creditScoreUnknown}
                        onChange={(e) => handleCreditScoreUnknownToggle(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <HelpCircle size={14} style={{ color: 'var(--accent-primary)' }} />
                      I don't know my credit score
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        name="creditScore"
                        className="form-input"
                        value={formData.creditScore}
                        onChange={(e) => { handleChange(e); setScoreEstimated(false); }}
                        min="300" max="850"
                        placeholder={creditScoreUnknown ? 'Auto-estimating...' : 'e.g. 720 (optional)'}
                        readOnly={creditScoreUnknown}
                        style={creditScoreUnknown ? { background: 'rgba(0,242,254,0.05)', cursor: 'not-allowed' } : {}}
                      />
                      {estimating && <Loader size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />}
                    </div>
                    {scoreEstimated && (
                      <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.75rem', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.25)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sparkles size={12} /> Estimated score (~{formData.creditScore}) — based on your financials, not a bureau score.
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block mt-4" style={{padding:'1.25rem',fontSize:'1.2rem'}}><Send size={24}/> {isEditing ? 'Update Application' : 'Submit Application'}</button>
                {isEditing && <button type="button" onClick={()=>setIsEditing(false)} className="btn btn-secondary btn-block mt-2" style={{padding:'1rem'}}>Cancel</button>}
              </form>
            </div>
          </Tilt>
          <DocumentUpload onDataExtracted={handleDocData} />
        </motion.div>
      )}
    </motion.div>
  );
};

export default UserDashboard;
