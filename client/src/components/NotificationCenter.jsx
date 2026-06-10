import React, { useState, useContext } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter = ({ application }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useContext(AuthContext);

  // Generate notifications based on application state
  const notifications = [];
  
  if (application) {
    notifications.push({
      id: 1,
      type: application.status === 'Approved' ? 'success' : application.status === 'Rejected' ? 'error' : 'warning',
      title: `Application ${application.status}`,
      message: application.status === 'Approved' 
        ? `Congratulations! Your credit limit of $${application.creditLimit.toLocaleString()} has been approved.`
        : application.status === 'Rejected'
        ? 'Your application was not approved at this time. Check the Path to Approval for improvement tips.'
        : 'Your application is currently under review.',
      time: 'Just now',
      icon: application.status === 'Approved' ? <CheckCircle size={16} /> : application.status === 'Rejected' ? <AlertCircle size={16} /> : <Clock size={16} />
    });

    if (application.riskLevel === 'Medium') {
      notifications.push({
        id: 2,
        type: 'info',
        title: 'Improvement Opportunity',
        message: 'Your risk level is Medium. Check the AI Roadmap for steps to reach Low risk.',
        time: 'Recent',
        icon: <AlertCircle size={16} />
      });
    }

    if (application.applicationHistory?.length > 0) {
      notifications.push({
        id: 3,
        type: 'success',
        title: 'History Available',
        message: `You have ${application.applicationHistory.length} previous submissions. Check the Trend Analysis section.`,
        time: 'Recent',
        icon: <CheckCircle size={16} />
      });
    }
  }

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-bell"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="notification-panel"
          >
            <div className="notification-panel-header">
              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Notifications</h4>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                  No notifications yet
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`notification-item notification-${notif.type}`}>
                    <div className="notification-icon">{notif.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>{notif.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{notif.message}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '4px' }}>{notif.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
