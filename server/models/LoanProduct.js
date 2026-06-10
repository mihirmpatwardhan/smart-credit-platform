const mongoose = require('mongoose');

const loanProductSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'Personal Loan', 'Auto Loan'
  icon: { type: String, default: 'wallet' }, // lucide-react icon name
  maxAmountFactor: { type: Number, required: true }, // Multiplier against income, e.g. 0.5 for Personal, 5 for Home
  baseInterestRate: { type: Number, required: true }, // e.g., 8.5
  tenure: { type: String, required: true }, // e.g., '12-60 months'
  minRiskScore: { type: Number, required: true }, // e.g., 40
  minIncome: { type: Number, required: true }, // e.g., 25000
  minEmploymentYears: { type: Number, default: 0 }, // e.g., 2
  features: { type: [String], default: [] },
  isActive: { type: Boolean, default: true }, // Admin can toggle off to hide from recommendations
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoanProduct', loanProductSchema);
