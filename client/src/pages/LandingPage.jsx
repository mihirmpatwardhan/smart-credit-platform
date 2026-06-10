import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { ShieldCheck, TrendingUp, Zap, BarChart3, ArrowRight, FileImage, Lock } from 'lucide-react';
import CreditEstimator from '../components/CreditEstimator';

const AnimatedSphere = () => {
  const meshRef = useRef();
  useFrame((state) => { meshRef.current.rotation.x = state.clock.getElapsedTime()*0.2; meshRef.current.rotation.y = state.clock.getElapsedTime()*0.3; });
  return (<Float speed={2} rotationIntensity={1.5} floatIntensity={2}><Sphere ref={meshRef} args={[1,64,64]} scale={2.5}><MeshDistortMaterial color="#00f2fe" attach="material" distort={0.4} speed={1.5} roughness={0.2} metalness={0.8}/></Sphere></Float>);
};

const LandingPage = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -100]);

  return (
    <div className="landing-container">
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 8] }}><ambientLight intensity={1}/><AnimatedSphere/><OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5}/></Canvas>
      </div>

      <section className="hero-section">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.8,ease:"easeOut"}} className="hero-content">
          <div className="badge mb-6" style={{background:'var(--accent-primary)',color:'#000',padding:'0.4rem 1rem',fontWeight:'bold'}}>CredSetu - Predict Risk, Protect Trust.</div>
          <h1 className="hero-title">Intelligent risk analysis <br/><span className="text-gradient">for modern finance.</span></h1>
          <p className="hero-subtitle">Leverage real-time AI modeling and secure automated underwriting to scale your financial institution with confidence.</p>
          <div className="hero-buttons" style={{display:'flex',gap:'1rem',marginTop:'2rem'}}>
            <Link to="/login" className="btn btn-primary hero-btn">User Login <ArrowRight size={18}/></Link>
            <Link to="/admin-login" className="btn btn-secondary hero-btn" style={{borderColor:'var(--danger)',color:'var(--danger)'}}>Admin Login</Link>
          </div>
        </motion.div>
      </section>

      <section className="features-section">
        <motion.div style={{ y: y1 }} className="features-grid">
          <FeatureCard icon={<ShieldCheck size={24}/>} title="Bank-Grade Security" desc="Military-grade encryption and 2FA authentication protect all sensitive financial data." delay={0.1}/>
          <FeatureCard icon={<TrendingUp size={24}/>} title="Predictive AI Models" desc="Proprietary machine learning models assess risk scores with high accuracy." delay={0.2}/>
          <FeatureCard icon={<Zap size={24}/>} title="Real-time Decisions" desc="Automated underwriting rules engine provides instant approvals." delay={0.3}/>
          <FeatureCard icon={<FileImage size={24}/>} title="Smart Document OCR" desc="Upload salary slips — AI extracts financial data automatically." delay={0.4}/>
          <FeatureCard icon={<BarChart3 size={24}/>} title="Advanced Analytics" desc="Export detailed reports and track your credit health trends over time." delay={0.5}/>
          <FeatureCard icon={<Lock size={24}/>} title="Two-Factor Auth" desc="Optional email OTP verification keeps your account secure." delay={0.6}/>
        </motion.div>
      </section>

      <CreditEstimator />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay }) => (
  <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-50px"}} transition={{duration:0.5,delay}} className="feature-card">
    <div className="feature-icon-wrapper">{icon}</div>
    <h3 style={{fontSize:'1.25rem',marginBottom:'0.75rem',fontWeight:600}}>{title}</h3>
    <p className="text-muted" style={{fontSize:'1rem',lineHeight:1.5}}>{desc}</p>
  </motion.div>
);

export default LandingPage;
