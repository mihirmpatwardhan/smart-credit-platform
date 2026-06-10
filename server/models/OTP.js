const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now } // Removed expires to prevent Atlas time skew auto-deletion during local testing
});

module.exports = mongoose.model('OTP', otpSchema);
