const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'UPDATE_RULES', 'VIEW_APPLICATION', 'DELETE_USER'
  target: { type: String, default: '' }, // e.g. 'Rule', 'Application:userId'
  details: { type: mongoose.Schema.Types.Mixed, default: {} }, // Any extra context
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient querying by date
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
