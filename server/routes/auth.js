const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendLoginOTP, verifyOTP, resendOTP, adminLogin, getMe } = require('../controllers/authController');
const User = require('../models/User');

// Public — send OTP to email (handles both login & registration)
router.post('/send-otp', sendLoginOTP);

// Public — verify OTP and get JWT token
router.post('/verify-otp', verifyOTP);

// Public — admin login with password
router.post('/admin-login', adminLogin);

// Public — resend OTP
router.post('/resend-otp', resendOTP);

// Protected — get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Protected — admin can update a user's role
router.put('/role', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change roles' });
    }
    const { userId, role } = req.body;
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
