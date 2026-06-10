const Application = require('../models/Application');
const Rule = require('../models/Rule');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const LoanProduct = require('../models/LoanProduct');

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().populate('user', 'name email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRules = async (req, res) => {
  try {
    let rules = await Rule.findOne();
    if (!rules) {
      rules = await Rule.create({});
    }
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRules = async (req, res) => {
  const { minIncome, maxDebtToIncomeRatio, baseCreditLimit } = req.body;
  try {
    let rules = await Rule.findOne();
    if (!rules) {
      rules = new Rule();
    }
    
    const oldRules = {
      minIncome: rules.minIncome,
      maxDebtToIncomeRatio: rules.maxDebtToIncomeRatio,
      baseCreditLimit: rules.baseCreditLimit
    };

    if (minIncome !== undefined) rules.minIncome = minIncome;
    if (maxDebtToIncomeRatio !== undefined) rules.maxDebtToIncomeRatio = maxDebtToIncomeRatio;
    if (baseCreditLimit !== undefined) rules.baseCreditLimit = baseCreditLimit;
    rules.updatedAt = Date.now();

    await rules.save();

    await AuditLog.create({
      admin: req.user.id,
      action: 'UPDATE_RULES',
      target: 'RiskEngine',
      details: {
        before: oldRules,
        after: { minIncome: rules.minIncome, maxDebtToIncomeRatio: rules.maxDebtToIncomeRatio, baseCreditLimit: rules.baseCreditLimit }
      }
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments()
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const stressTestRules = async (req, res) => {
  const { minIncome, maxDebtToIncomeRatio, baseCreditLimit } = req.body;

  try {
    const applications = await Application.find().populate('user', 'name email');

    const results = applications.map(app => {
      const dti = app.existingDebt / (app.income || 1);
      
      let newRiskScore = 50;
      if (app.income > minIncome) newRiskScore += 20;
      if (dti < maxDebtToIncomeRatio) newRiskScore += 20;
      else newRiskScore -= 20;
      if (app.employmentYears > 2) newRiskScore += 10;
      if (app.employmentYears > 5) newRiskScore += 10;
      newRiskScore = Math.max(0, Math.min(100, newRiskScore));

      let newStatus, newRiskLevel, newCreditLimit;
      if (newRiskScore >= 70) {
        newStatus = 'Approved';
        newRiskLevel = 'Low';
        newCreditLimit = baseCreditLimit + (app.income * 0.1);
      } else if (newRiskScore >= 40) {
        newStatus = 'Approved';
        newRiskLevel = 'Medium';
        newCreditLimit = baseCreditLimit;
      } else {
        newStatus = 'Rejected';
        newRiskLevel = 'High';
        newCreditLimit = 0;
      }

      return {
        userId: app.user?._id,
        userName: app.user?.name || 'Unknown',
        currentStatus: app.status,
        newStatus,
        currentRiskScore: app.riskScore,
        newRiskScore,
        currentRiskLevel: app.riskLevel,
        newRiskLevel,
        currentCreditLimit: app.creditLimit,
        newCreditLimit: Math.round(newCreditLimit),
        changed: app.status !== newStatus
      };
    });

    const summary = {
      totalApplications: results.length,
      wouldApprove: results.filter(r => r.newStatus === 'Approved').length,
      wouldReject: results.filter(r => r.newStatus === 'Rejected').length,
      statusChanges: results.filter(r => r.changed).length,
      changedApplications: results.filter(r => r.changed)
    };

    await AuditLog.create({
      admin: req.user.id,
      action: 'STRESS_TEST',
      target: 'RiskEngine',
      details: { hypotheticalRules: { minIncome, maxDebtToIncomeRatio, baseCreditLimit }, summary: { total: summary.totalApplications, changes: summary.statusChanges } }
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const seedDefaultLoanProducts = async () => {
  const defaults = [
    { type: 'Personal Loan', icon: 'wallet', maxAmountFactor: 0.5, baseInterestRate: 12.0, tenure: '12–60 months', minRiskScore: 40, minIncome: 0, minEmploymentYears: 0, isActive: true, features: ['No collateral required', 'Flexible repayment', 'Quick disbursement'] },
    { type: 'Home Loan', icon: 'home', maxAmountFactor: 5, baseInterestRate: 7.5, tenure: '10–30 years', minRiskScore: 55, minIncome: 40000, minEmploymentYears: 2, isActive: true, features: ['Lowest interest rates', 'Tax benefits available', 'Up to 30-year tenure'] },
    { type: 'Auto Loan', icon: 'car', maxAmountFactor: 0.8, baseInterestRate: 8.9, tenure: '12–72 months', minRiskScore: 40, minIncome: 25000, minEmploymentYears: 0, isActive: true, features: ['Vehicle as collateral', 'Lower rates than personal', 'Pre-approved offers'] },
    { type: 'Education Loan', icon: 'graduation', maxAmountFactor: 1.5, baseInterestRate: 7.0, tenure: '5–15 years', minRiskScore: 30, minIncome: 0, minEmploymentYears: 0, isActive: true, features: ['Moratorium period available', 'Tax deduction on interest', 'Cover tuition + living'] },
    { type: 'Business Loan', icon: 'briefcase', maxAmountFactor: 3, baseInterestRate: 11.0, tenure: '12–84 months', minRiskScore: 60, minIncome: 50000, minEmploymentYears: 3, isActive: true, features: ['Working capital support', 'Equipment financing', 'Flexible collateral options'] }
  ];
  await LoanProduct.insertMany(defaults);
};

// Admin sees ALL products (including inactive) for management
const getLoanProducts = async (req, res) => {
  try {
    let products = await LoanProduct.find().sort({ minRiskScore: 1 });
    if (products.length === 0) {
      await seedDefaultLoanProducts();
      products = await LoanProduct.find().sort({ minRiskScore: 1 });
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createLoanProduct = async (req, res) => {
  try {
    const product = await LoanProduct.create(req.body);
    
    await AuditLog.create({
      admin: req.user.id, action: 'CREATE_LOAN_PRODUCT', target: 'LoanProducts',
      details: { type: product.type, isActive: product.isActive }
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLoanProduct = async (req, res) => {
  try {
    const product = await LoanProduct.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    await AuditLog.create({
      admin: req.user.id, action: 'UPDATE_LOAN_PRODUCT', target: 'LoanProducts',
      details: { type: product.type, isActive: product.isActive }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Quick toggle for isActive — no need to open full edit modal
const toggleLoanProductActive = async (req, res) => {
  try {
    const product = await LoanProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = !product.isActive;
    product.updatedAt = Date.now();
    await product.save();

    await AuditLog.create({
      admin: req.user.id, action: product.isActive ? 'ACTIVATE_LOAN_PRODUCT' : 'DEACTIVATE_LOAN_PRODUCT',
      target: 'LoanProducts', details: { type: product.type, isActive: product.isActive }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLoanProduct = async (req, res) => {
  try {
    const product = await LoanProduct.findByIdAndDelete(req.params.id);
    
    if (product) {
      await AuditLog.create({
        admin: req.user.id, action: 'DELETE_LOAN_PRODUCT', target: 'LoanProducts', details: { type: product.type }
      });
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  const { status, creditLimit } = req.body;
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const before = { status: app.status, creditLimit: app.creditLimit };
    
    if (status !== undefined) app.status = status;
    if (creditLimit !== undefined) app.creditLimit = creditLimit;
    
    await app.save();

    await AuditLog.create({
      admin: req.user.id,
      action: 'OVERRIDE_APPLICATION',
      target: `Application:${app._id}`,
      details: { before, after: { status: app.status, creditLimit: app.creditLimit } }
    });

    res.json(app);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllApplications, getRules, updateRules, getAllUsers, getAuditLogs, stressTestRules,
  getLoanProducts, createLoanProduct, updateLoanProduct, toggleLoanProductActive, deleteLoanProduct,
  updateApplicationStatus
};
