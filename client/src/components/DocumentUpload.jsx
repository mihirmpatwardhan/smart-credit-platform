import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Upload, FileImage, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DocumentUpload = ({ onDataExtracted }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setError('');
    setResult(null);
    
    // Preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      
      // Send to API
      setLoading(true);
      try {
        const { data } = await api.post('/documents/upload', { image: base64 });
        setResult(data);
      } catch (err) {
        setError('Failed to analyze document. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleInputChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleAutoFill = () => {
    if (result && result.extracted && onDataExtracted) {
      onDataExtracted({
        income: result.income || '',
        existingDebt: result.existingDebt || '',
        employmentYears: result.employmentYears || ''
      });
    }
  };

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>
        <FileImage size={22} /> Smart Document Scanner
      </h3>
      <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Upload a salary slip or bank statement — our AI will extract your financial data automatically.
      </p>

      <div
        className={`dropzone ${dragActive ? 'active' : ''} ${preview ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={handleInputChange} style={{ display: 'none' }} />
        
        {preview ? (
          <div style={{ textAlign: 'center' }}>
            <img src={preview} alt="Uploaded document" style={{ maxHeight: '120px', borderRadius: '8px', marginBottom: '0.5rem', opacity: 0.7 }} />
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Click or drop to replace</p>
          </div>
        ) : (
          <>
            <Upload size={32} className="text-muted" style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Drop your document here</p>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>or click to browse (PNG, JPG)</p>
          </>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Loader size={20} className="spin" />
          <span className="text-muted">AI is analyzing your document...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,0,85,0.1)', borderRadius: '8px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <AnimatePresence>
        {result && result.extracted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginTop: '1.5rem' }}
          >
            <div style={{ padding: '1rem', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '10px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--success)' }}>
                <CheckCircle size={16} /> Data Extracted Successfully
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {result.income && <div><span className="text-muted">Income:</span> <strong>${result.income.toLocaleString()}</strong></div>}
                {result.existingDebt && <div><span className="text-muted">Debt:</span> <strong>${result.existingDebt.toLocaleString()}</strong></div>}
                {result.employmentYears && <div><span className="text-muted">Employment:</span> <strong>{result.employmentYears} years</strong></div>}
                {result.notes && <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{result.notes}</div>}
              </div>
            </div>
            <button onClick={handleAutoFill} className="btn btn-primary btn-block" style={{ padding: '0.75rem' }}>
              ✨ Auto-fill Application Form
            </button>
          </motion.div>
        )}

        {result && !result.extracted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,183,3,0.1)', border: '1px solid rgba(255,183,3,0.2)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
              <AlertCircle size={16} /> {result.notes || 'Could not extract data from this document.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentUpload;
