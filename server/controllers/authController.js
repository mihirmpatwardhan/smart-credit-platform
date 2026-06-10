const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../services/emailService');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPToUser = async (email, otpCode) => {
  try {
    console.log(`📧 Sending OTP to: ${email}...`);
    await sendOTP(email, otpCode);
    console.log(`✅ OTP sent successfully to: ${email}`);
  } catch (emailError) {
    console.error(`❌ Failed to send OTP to ${email}:`, emailError.message);
    // Fallback: print to server console ONLY (never to client)
    console.log(`\n========================================`);
    console.log(`🛠️  [SERVER FALLBACK] OTP FOR: ${email}`);
    console.log(`👉 CODE: ${otpCode}`);
    console.log(`========================================\n`);
  }
};

// SEND OTP — for both login and registration
// User provides email (and name for new users). OTP is sent to email.
const sendLoginOTP = async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const emailNormalized = email.toLowerCase().trim();
    let user = await User.findOne({ email: emailNormalized });

    // If user doesn't exist, create a new account
    if (!user) {
      if (!name || !name.trim()) {
        return res.status(404).json({ 
          message: 'new_user',
          hint: 'No account found. Please provide your name to register.'
        });
      }

      // First user ever becomes admin
      const isFirstUser = (await User.countDocuments({})) === 0;
      const role = isFirstUser ? 'admin' : 'user';

      user = await User.create({
        name: name.trim(),
        email: emailNormalized,
        role,
        isEmailVerified: false
      });
    }

    // Generate and send OTP
    const otpCode = generateOTPCode();
    await OTP.deleteMany({ email: emailNormalized });
    await OTP.create({ email: emailNormalized, otp: otpCode, purpose: 'login' });
    await sendOTPToUser(emailNormalized, otpCode);

    res.json({
      otpSent: true,
      email: emailNormalized,
      isNewUser: !user.isEmailVerified,
      message: `OTP sent to ${emailNormalized}. Check your inbox.`
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// VERIFY OTP — verifies code and issues JWT token
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const emailNormalized = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ email: emailNormalized, otp, verified: false });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find the user and issue token
    const user = await User.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark email as verified
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    // Clean up used OTPs
    await OTP.deleteMany({ email: emailNormalized });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESEND OTP
const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const emailNormalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpCode = generateOTPCode();
    await OTP.deleteMany({ email: emailNormalized });
    await OTP.create({ email: emailNormalized, otp: otpCode, purpose: 'login' });
    await sendOTPToUser(emailNormalized, otpCode);

    res.json({
      message: 'New OTP sent successfully. Check your email.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const emailNormalized = email.toLowerCase().trim();
    if (emailNormalized !== 'mihirpatwardhan9588@gmail.com') {
      return res.status(403).json({ message: 'Invalid admin email address.' });
    }
    if (password !== 'MIHIR8444') {
      return res.status(403).json({ message: 'Invalid admin credentials.' });
    }

    let user = await User.findOne({ email: emailNormalized });
    if (!user) {
      user = await User.create({
        name: 'Mihir Admin',
        email: emailNormalized,
        role: 'admin',
        isEmailVerified: true
      });
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendLoginOTP,
  verifyOTP,
  resendOTP,
  adminLogin,
  getMe
};
