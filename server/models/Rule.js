const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  minIncome: { type: Number, default: 30000 },
  maxDebtToIncomeRatio: { type: Number, default: 0.4 }, // 40%
  baseCreditLimit: { type: Number, default: 1000 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rule', ruleSchema);
