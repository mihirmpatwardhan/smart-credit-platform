const { chatWithAI } = require('../services/aiService');

const handleChat = async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const reply = await chatWithAI(message, history);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { handleChat };
