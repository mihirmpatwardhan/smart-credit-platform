const Application = require('../models/Application');
const Rule = require('../models/Rule');
const { generateRiskInsight, generatePathToApproval, generateLoanRecommendations } = require('../services/aiService');

const submitApplication = async (req, res) => {
  const { income, existingDebt, employmentYears, creditScore } = req.body;

  try {
    // Get active rules (or create default if none exists)
    let rules = await Rule.findOne();
    if (!rules) {
      rules = await Rule.create({});
    }

    // If an existing application exists, save its current state to history
    const existingApp = await Application.findOne({ user: req.user.id });
    let historyUpdate = {};
    if (existingApp) {
      historyUpdate = {
        $push: {
          applicationHistory: {
            income: existingApp.income,
            existingDebt: existingApp.existingDebt,
            employmentYears: existingApp.employmentYears,
            creditScore: existingApp.creditScore,
            riskScore: existingApp.riskScore,
            riskLevel: existingApp.riskLevel,
            creditLimit: existingApp.creditLimit,
            status: existingApp.status,
            submittedAt: existingApp.createdAt || new Date()
          }
        }
      };
    }

    // Calculate Debt to Income Ratio
    const dti = existingDebt / (income || 1);
    
    // Logic for Risk Score (0-100, higher is better)
    let riskScore = 50; // base score
    if (income > rules.minIncome) riskScore += 20;
    if (dti < rules.maxDebtToIncomeRatio) riskScore += 20;
    else riskScore -= 20;
    
    if (employmentYears > 2) riskScore += 10;
    if (employmentYears > 5) riskScore += 10;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Determine Status and Limit
    let status = 'Pending';
    let riskLevel = 'Pending';
    let creditLimit = 0;

    if (riskScore >= 70) {
      status = 'Approved';
      riskLevel = 'Low';
      creditLimit = rules.baseCreditLimit + (income * 0.1);
    } else if (riskScore >= 40) {
      status = 'Approved';
      riskLevel = 'Medium';
      creditLimit = rules.baseCreditLimit;
    } else {
      status = 'Rejected';
      riskLevel = 'High';
      creditLimit = 0;
    }

    // Generate AI Insight
    const aiAdvice = await generateRiskInsight({
      income, existingDebt, employmentYears, creditScore
    });

    // Generate Path to Approval roadmap
    const pathToApproval = await generatePathToApproval({
      income, existingDebt, employmentYears, creditScore,
      riskScore, riskLevel, status
    });

    // Generate Loan Recommendations to store in DB
    const loanRecResult = await generateLoanRecommendations({
      income,
      existingDebt,
      employmentYears,
      creditScore,
      riskScore,
      riskLevel,
      creditLimit
    });

    const applicationData = {
      user: req.user.id,
      income,
      existingDebt,
      employmentYears,
      creditScore,
      riskScore,
      riskLevel,
      creditLimit,
      status,
      aiAdvice,
      pathToApproval,
      recommendedLoans: loanRecResult.recommendations || [],
      aiRecommendationSummary: loanRecResult.summary || ''
    };

    // UPSERT: Update if exists, create if not, and push history
    const updateOperation = existingApp
      ? { $set: applicationData, ...historyUpdate }
      : { $set: applicationData };

    const application = await Application.findOneAndUpdate(
      { user: req.user.id },
      updateOperation,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(application);
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMyApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ user: req.user.id });
    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getApplicationHistory = async (req, res) => {
  try {
    const application = await Application.findOne({ user: req.user.id });
    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    // Combine history + current into a timeline
    const history = application.applicationHistory || [];
    const current = {
      income: application.income,
      existingDebt: application.existingDebt,
      employmentYears: application.employmentYears,
      creditScore: application.creditScore,
      riskScore: application.riskScore,
      riskLevel: application.riskLevel,
      creditLimit: application.creditLimit,
      status: application.status,
      submittedAt: application.createdAt
    };
    
    res.json([...history, current]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const simulateLoan = async (req, res) => {
  const { loanAmount, durationMonths } = req.body;

  try {
    const application = await Application.findOne({ user: req.user.id });
    if (!application) {
      return res.status(404).json({ message: 'Submit an application first to use the simulator.' });
    }

    // Interest rate based on risk score (higher score = lower rate)
    let baseRate;
    if (application.riskScore >= 70) baseRate = 5.5;       // Low risk
    else if (application.riskScore >= 40) baseRate = 9.5;   // Medium risk
    else baseRate = 15.0;                                     // High risk

    // Adjust for loan duration
    const durationFactor = durationMonths > 36 ? 1.5 : durationMonths > 12 ? 1.0 : 0.5;
    const annualRate = baseRate + durationFactor;
    const monthlyRate = annualRate / 100 / 12;

    // Calculate monthly payment using amortization formula
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, durationMonths))
      / (Math.pow(1 + monthlyRate, durationMonths) - 1);

    const totalPayment = monthlyPayment * durationMonths;
    const totalInterest = totalPayment - loanAmount;

    res.json({
      loanAmount,
      durationMonths,
      annualRate: Math.round(annualRate * 100) / 100,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      riskScore: application.riskScore,
      riskLevel: application.riskLevel
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const estimateCredit = async (req, res) => {
  const { income, existingDebt, employmentYears } = req.body;

  try {
    let rules = await Rule.findOne();
    if (!rules) {
      rules = await Rule.create({});
    }

    const dti = existingDebt / (income || 1);
    
    let riskScore = 50;
    if (income > rules.minIncome) riskScore += 20;
    if (dti < rules.maxDebtToIncomeRatio) riskScore += 20;
    else riskScore -= 20;
    if (employmentYears > 2) riskScore += 10;
    if (employmentYears > 5) riskScore += 10;
    riskScore = Math.max(0, Math.min(100, riskScore));

    let riskLevel = 'Pending';
    let estimatedLimit = 0;
    let status = 'Pending';

    if (riskScore >= 70) {
      status = 'Likely Approved';
      riskLevel = 'Low';
      estimatedLimit = rules.baseCreditLimit + (income * 0.1);
    } else if (riskScore >= 40) {
      status = 'Likely Approved';
      riskLevel = 'Medium';
      estimatedLimit = rules.baseCreditLimit;
    } else {
      status = 'Unlikely';
      riskLevel = 'High';
      estimatedLimit = 0;
    }

    res.json({
      riskScore,
      riskLevel,
      estimatedLimit: Math.round(estimatedLimit),
      status,
      debtToIncomeRatio: Math.round(dti * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getLoanRecommendations = async (req, res) => {
  try {
    const application = await Application.findOne({ user: req.user.id });
    if (!application) {
      return res.status(404).json({ message: 'Submit an application first to get recommendations.' });
    }

    // Return pre-calculated recommendations stored in the database
    res.json({
      recommendations: application.recommendedLoans || [],
      summary: application.aiRecommendationSummary || '',
      bestMatch: application.recommendedLoans?.length > 0 ? application.recommendedLoans[0].type : null,
      totalEligibleAmount: application.recommendedLoans?.reduce((sum, r) => sum + r.maxAmount, 0) || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitApplication, getMyApplication, getApplicationHistory, simulateLoan, estimateCredit, getLoanRecommendations };
