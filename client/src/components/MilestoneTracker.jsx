import React from 'react';
import { CheckCircle, Cpu, Shield, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { icon: <FileCheck size={20} />, label: 'Received', key: 'received' },
  { icon: <Cpu size={20} />, label: 'AI Analysis', key: 'analysis' },
  { icon: <Shield size={20} />, label: 'Risk Scoring', key: 'scoring' },
  { icon: <CheckCircle size={20} />, label: 'Decision', key: 'decision' }
];

const MilestoneTracker = ({ status }) => {
  // All steps are always complete once an application exists
  const completedSteps = status ? 4 : 0;

  return (
    <div className="milestone-tracker">
      {steps.map((step, index) => {
        const isComplete = index < completedSteps;
        const isCurrent = index === completedSteps;
        
        return (
          <React.Fragment key={step.key}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.15, duration: 0.4 }}
              className={`milestone-step ${isComplete ? 'complete' : isCurrent ? 'current' : 'pending'}`}
            >
              <div className="milestone-icon">{step.icon}</div>
              <span className="milestone-label">{step.label}</span>
            </motion.div>
            {index < steps.length - 1 && (
              <div className={`milestone-connector ${isComplete ? 'complete' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MilestoneTracker;
