const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  income: { type: Number, required: true },
  existingDebt: { type: Number, required: true },
  employmentYears: { type: Number, required: true },
  creditScore: { type: Number, default: 0 }, // Traditional score if available
  
  // System calculated fields
  riskScore: { type: Number, default: 0 }, // Platform's internal risk score (0-100)
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Pending'], default: 'Pending' },
  creditLimit: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  aiAdvice: { type: String, default: '' },
  pathToApproval: { type: String, default: '' },
  
  // Recommended Loans stored in the DB
  recommendedLoans: [{
    type: { type: String, required: true },
    icon: { type: String, default: 'wallet' },
    maxAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenure: { type: String, required: true },
    eligibility: { type: String, required: true },
    reason: { type: String, required: true },
    features: [{ type: String }],
    monthlyEMI: { type: Number, default: 0 }
  }],
  aiRecommendationSummary: { type: String, default: '' },

  // Historical tracking for trend analysis
  applicationHistory: [{
    income: Number,
    existingDebt: Number,
    employmentYears: Number,
    creditScore: Number,
    riskScore: Number,
    riskLevel: String,
    creditLimit: Number,
    status: String,
    submittedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
