import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Home } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, MeshWobbleMaterial, Float } from '@react-three/drei';

const BrokenCube = () => {
  return (
    <Float speed={3} rotationIntensity={2} floatIntensity={5}>
      <Box args={[2, 2, 2]}>
        <MeshWobbleMaterial color="#ff0055" attach="material" factor={1} speed={2} roughness={0.1} metalness={0.8} wireframe />
      </Box>
    </Float>
  );
};

const NotFound = () => {
  return (
    <div className="not-found-container" style={{ height: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Canvas camera={{ position: [0, 0, 6] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} color="#ff0055" />
          <BrokenCube />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
        </Canvas>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
        className="glass-card text-center"
        style={{ maxWidth: '500px', zIndex: 1, padding: '4rem 3rem' }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ display: 'inline-block', marginBottom: '1.5rem' }}
        >
          <AlertTriangle size={64} className="text-danger" />
        </motion.div>
        
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--accent-danger)' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Connection Lost</h2>
        <p className="text-muted mb-6" style={{ fontSize: '1.1rem' }}>
          We couldn't find the financial sector you're looking for. The node might be offline or the URL is invalid.
        </p>
        
        <Link to="/" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          <Home size={20} /> Return to Grid
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
