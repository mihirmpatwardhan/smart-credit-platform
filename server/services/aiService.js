const { GoogleGenAI } = require('@google/genai');
const LoanProduct = require('../models/LoanProduct');

const apiKey = process.env.GEMINI_API_KEY;
let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
}

const generateRiskInsight = async (applicationData) => {
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found, using mock AI structured response.');
    return JSON.stringify({
      summary: "Based on the provided data, the applicant shows moderate risk.",
      strengths: ["Stable employment history", "Manageable debt-to-income ratio"],
      weaknesses: ["Credit score could be improved", "Relatively low base income"],
      recommendation: "Approve with standard limits, but monitor debt growth."
    });
  }

  try {
    const prompt = `
      You are an expert financial risk analyst AI. Review the following applicant's financial profile.
      You MUST return your analysis as a pure JSON object (no markdown formatting, no backticks).
      
      The JSON must have this exact structure:
      {
        "summary": "A comprehensive, clear 2-3 sentence overall risk summary detailing the applicant's financial situation, repayment capacity, and key observations.",
        "strengths": ["array of 3-5 detailed strength points with specific numbers/metrics from the profile (e.g. debt-to-income ratio, stable tenure)"],
        "weaknesses": ["array of 3-5 detailed weakness/risk points with specific numbers/metrics from the profile"],
        "recommendation": "A clear, actionable final advice on approval, credit limit, or next steps."
      }

      Applicant Profile:
      - Annual Income: $${applicationData.income}
      - Existing Debt: $${applicationData.existingDebt}
      - Employment Length: ${applicationData.employmentYears} years
      - Credit Score: ${applicationData.creditScore > 0 ? applicationData.creditScore : 'Unknown (estimated from financials)'}
      - Credit Score Source: ${applicationData.creditScoreEstimated ? 'Platform Estimate' : 'Self-Declared'}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    let text = response.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    return text.trim();
  } catch (error) {
    console.error('AI Service Error:', error);
    return JSON.stringify({
      summary: "Error generating AI insight. Please review manually.",
      strengths: [],
      weaknesses: [],
      recommendation: "Review manually."
    });
  }
};

const generatePathToApproval = async (applicationData) => {
  if (!apiKey) {
    return JSON.stringify({
      currentStatus: applicationData.status,
      overallMessage: "Here's your personalized roadmap to improve your credit profile.",
      steps: [
        {
          title: "Reduce Outstanding Debt",
          description: `Aim to reduce your debt by at least $${Math.round(applicationData.existingDebt * 0.3).toLocaleString()} to lower your debt-to-income ratio below 40%.`,
          impact: "high",
          targetValue: `$${Math.round(applicationData.existingDebt * 0.7).toLocaleString()}`
        },
        {
          title: "Maintain Employment Stability",
          description: `Continue with your current employer. ${applicationData.employmentYears < 5 ? `After ${Math.ceil(5 - applicationData.employmentYears)} more years, you'll qualify for maximum employment bonus.` : 'Your long tenure is already a strong asset.'}`,
          impact: "medium",
          targetValue: `${Math.max(5, applicationData.employmentYears)} years`
        },
        {
          title: "Increase Annual Income",
          description: "Consider upskilling or negotiating a raise to boost your income bracket.",
          impact: "high",
          targetValue: `$${Math.round(applicationData.income * 1.2).toLocaleString()}`
        }
      ],
      estimatedImprovement: "+15-25 points on risk score"
    });
  }

  try {
    const prompt = `
      You are a financial advisor AI. Based on the applicant's current profile, create a personalized "Path to Approval" roadmap.
      Return ONLY a pure JSON object (no markdown, no backticks).
      
      JSON structure:
      {
        "currentStatus": "${applicationData.status}",
        "overallMessage": "A motivating 1-sentence summary of their path forward",
        "steps": [
          {
            "title": "Short action title",
            "description": "Specific, actionable advice with real numbers based on their data",
            "impact": "high|medium|low",
            "targetValue": "A specific numeric target like $X or Y years"
          }
        ],
        "estimatedImprovement": "Estimated risk score improvement range"
      }

      Provide exactly 3-4 steps. Be specific with dollar amounts and timeframes based on their data.

      Current Profile:
      - Annual Income: $${applicationData.income}
      - Existing Debt: $${applicationData.existingDebt}
      - Employment Length: ${applicationData.employmentYears} years
      - Credit Score: ${applicationData.creditScore > 0 ? applicationData.creditScore : 'Unknown (estimated from financials)'}
      - Current Risk Score: ${applicationData.riskScore}/100
      - Current Status: ${applicationData.status}
      - Current Risk Level: ${applicationData.riskLevel}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    return text.trim();
  } catch (error) {
    console.error('Path to Approval AI Error:', error);
    return JSON.stringify({
      currentStatus: applicationData.status,
      overallMessage: "Unable to generate roadmap at this time.",
      steps: [],
      estimatedImprovement: "N/A"
    });
  }
};

const analyzeDocument = async (base64Image) => {
  if (!apiKey) {
    return JSON.stringify({
      extracted: true,
      income: 75000,
      existingDebt: 12000,
      employmentYears: 4,
      confidence: "mock",
      notes: "This is mock data. Configure GEMINI_API_KEY for real OCR."
    });
  }

  try {
    const prompt = `You are a financial document analysis AI. Analyze this document image (salary slip, bank statement, or income proof).
    Extract financial information and return ONLY a pure JSON object (no markdown, no backticks):
    {
      "extracted": true,
      "income": <estimated annual income as number, or null if not found>,
      "existingDebt": <estimated total debt as number, or null if not found>,
      "employmentYears": <employment duration in years as number, or null if not found>,
      "confidence": "high|medium|low",
      "notes": "Brief description of what was found in the document"
    }
    
    If the image is not a financial document, return:
    { "extracted": false, "notes": "This does not appear to be a financial document." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image
          }
        }
      ],
    });

    let text = response.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    return text.trim();
  } catch (error) {
    console.error('Document Analysis AI Error:', error);
    return JSON.stringify({
      extracted: false,
      notes: "Error analyzing document. Please try again or enter data manually."
    });
  }
};

const chatWithAI = async (message, history) => {
  if (!apiKey) {
    return "I am the mock AI assistant. To enable real chat, please add your Gemini API Key to the .env file!";
  }

  try {
    const systemPrompt = `You are the 'Smart Credit Assistant', a helpful AI integrated into a FinTech platform. 
    Keep your answers concise, professional, and friendly. You help users understand credit scores, debt-to-income ratios, and how financial risk is evaluated.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nUser Question: ${message}`,
    });

    return response.text;
  } catch (error) {
    console.error('Chat AI Error:', error);
    return "I'm having trouble connecting to my brain right now. Please try again later.";
  }
};

const generateLoanRecommendations = async (applicationData) => {
  const { income, existingDebt, employmentYears, riskScore, riskLevel, creditLimit } = applicationData;
  const dti = existingDebt / (income || 1);
  const availableIncome = income - existingDebt;

  // ONLY fetch active products — no hardcoded fallbacks
  let dbProducts = [];
  try {
    dbProducts = await LoanProduct.find({ isActive: true }).sort({ minRiskScore: 1 });
    
    // Auto-seed defaults if database is completely empty so user never sees blank recommendations
    if (dbProducts.length === 0) {
      const count = await LoanProduct.countDocuments({});
      if (count === 0) {
        console.log('Seeding default loan products from AI recommendation service...');
        const defaults = [
          { type: 'Personal Loan', icon: 'wallet', maxAmountFactor: 0.5, baseInterestRate: 12.0, tenure: '12–60 months', minRiskScore: 40, minIncome: 0, minEmploymentYears: 0, isActive: true, features: ['No collateral required', 'Flexible repayment', 'Quick disbursement'] },
          { type: 'Home Loan', icon: 'home', maxAmountFactor: 5, baseInterestRate: 7.5, tenure: '10–30 years', minRiskScore: 55, minIncome: 40000, minEmploymentYears: 2, isActive: true, features: ['Lowest interest rates', 'Tax benefits available', 'Up to 30-year tenure'] },
          { type: 'Auto Loan', icon: 'car', maxAmountFactor: 0.8, baseInterestRate: 8.9, tenure: '12–72 months', minRiskScore: 40, minIncome: 25000, minEmploymentYears: 0, isActive: true, features: ['Vehicle as collateral', 'Lower rates than personal', 'Pre-approved offers'] },
          { type: 'Education Loan', icon: 'graduation', maxAmountFactor: 1.5, baseInterestRate: 7.0, tenure: '5–15 years', minRiskScore: 30, minIncome: 0, minEmploymentYears: 0, isActive: true, features: ['Moratorium period available', 'Tax deduction on interest', 'Cover tuition + living'] },
          { type: 'Business Loan', icon: 'briefcase', maxAmountFactor: 3, baseInterestRate: 11.0, tenure: '12–84 months', minRiskScore: 60, minIncome: 50000, minEmploymentYears: 3, isActive: true, features: ['Working capital support', 'Equipment financing', 'Flexible collateral options'] }
        ];
        await LoanProduct.insertMany(defaults);
        dbProducts = await LoanProduct.find({ isActive: true }).sort({ minRiskScore: 1 });
      }
    }
  } catch (error) {
    console.error('Error fetching active loan products:', error);
  }

  const buildRecommendations = (aiEnhanced = null) => {
    const recommendations = [];

    dbProducts.forEach(product => {
      // Check eligibility based on all product rules
      if (
        riskScore >= product.minRiskScore &&
        income >= product.minIncome &&
        employmentYears >= product.minEmploymentYears
      ) {
        // Calculate max amount
        let maxAmount = income * product.maxAmountFactor;
        if (product.type === 'Home Loan') maxAmount = Math.min(maxAmount, 1000000);
        else if (product.type === 'Personal Loan') maxAmount = Math.min(availableIncome * product.maxAmountFactor, creditLimit * 2, 50000);
        else maxAmount = Math.min(maxAmount, 250000);
        
        maxAmount = Math.round(maxAmount);
        if (maxAmount <= 0) return;

        // Eligibility confidence based on margin above minimum
        let eligibility = 'low';
        if (riskScore >= product.minRiskScore + 20) eligibility = 'high';
        else if (riskScore >= product.minRiskScore + 10) eligibility = 'medium';

        // Parse tenure to months for EMI calculation
        let tenureMonths = 36;
        if (product.tenure.includes('year')) {
          const match = product.tenure.match(/(\d+)/);
          if (match) tenureMonths = parseInt(match[1]) * 12;
        } else {
          const match = product.tenure.match(/(\d+)/);
          if (match) tenureMonths = parseInt(match[1]);
        }
        
        const rate = product.baseInterestRate;
        const monthlyEMI = Math.round(
          (maxAmount * (rate / 100 / 12) * Math.pow(1 + rate / 100 / 12, tenureMonths)) /
          (Math.pow(1 + rate / 100 / 12, tenureMonths) - 1)
        );

        recommendations.push({
          type: product.type,
          icon: product.icon || 'wallet',
          maxAmount,
          interestRate: rate,
          tenure: product.tenure,
          eligibility,
          reason: `Based on your risk score of ${riskScore}/100 and $${income.toLocaleString()} income, you meet the eligibility criteria for this product.`,
          features: product.features,
          monthlyEMI: monthlyEMI || 0
        });
      }
    });

    // Sort by eligibility: high → medium → low
    const order = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => (order[a.eligibility] || 2) - (order[b.eligibility] || 2));

    return {
      recommendations,
      summary: aiEnhanced || (
        recommendations.length > 0
          ? `Based on your risk score of ${riskScore}/100 (${riskLevel} risk), we found ${recommendations.length} loan products matching your profile.`
          : `Your current risk profile does not meet the minimum requirements for any active loan products. Improving your risk score and income will unlock more options.`
      ),
      bestMatch: recommendations.length > 0 ? recommendations[0].type : null,
      totalEligibleAmount: recommendations.reduce((sum, r) => sum + r.maxAmount, 0)
    };
  };

  if (!apiKey) {
    return buildRecommendations();
  }

  try {
    const prompt = `You are a personalized loan advisor AI for the premium FinTech platform 'CredSetu'. Based on this applicant's profile, write a highly detailed, comprehensive, and warm professional loan recommendation report. 
    
    The report should consist of multiple rich paragraphs:
    1. A thorough evaluation of their income-to-debt metrics, highlighting their Debt-to-Income (DTI) ratio, and how it impacts their borrowing capacity.
    2. Specific advice on which loan products they are highly qualified for and why, detailing the advantages of those specific options.
    3. Strategic financial recommendations to either reduce outstanding debt, improve their credit score, or negotiate lower interest rates on future loans.

    Profile:
    - Annual Income: $${income}
    - Existing Debt: $${existingDebt}
    - DTI Ratio: ${(dti * 100).toFixed(1)}%
    - Employment: ${employmentYears} years
    - Risk Score: ${riskScore}/100 (${riskLevel})
    - Credit Limit: $${creditLimit}

    Return ONLY a beautifully structured plain text report with clear line breaks (no JSON, no markdown formatting). Keep it warm, professional, highly analytical, and detailed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiSummary = response.text.trim();
    return buildRecommendations(aiSummary);
  } catch (error) {
    console.error('Loan Recommendation AI Error:', error);
    return buildRecommendations();
  }
};

module.exports = { generateRiskInsight, generatePathToApproval, analyzeDocument, chatWithAI, generateLoanRecommendations };
