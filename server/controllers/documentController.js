const { analyzeDocument } = require('../services/aiService');

const uploadDocument = async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ message: 'No image data provided' });
  }

  try {
    // Remove data URL prefix if present
    let base64Data = image;
    if (image.includes(',')) {
      base64Data = image.split(',')[1];
    }

    const result = await analyzeDocument(base64Data);
    
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      parsed = { extracted: false, notes: 'Could not parse AI response.' };
    }

    res.json(parsed);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocument };
