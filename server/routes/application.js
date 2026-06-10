const express = require('express');
const router = express.Router();
const { submitApplication, getMyApplication, getApplicationHistory, simulateLoan, estimateCredit, getLoanRecommendations } = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitApplication);
router.get('/me', protect, getMyApplication);
router.get('/history', protect, getApplicationHistory);
router.get('/recommendations', protect, getLoanRecommendations);
router.post('/simulate', protect, simulateLoan);
router.post('/estimate', estimateCredit); // Public — no auth required

module.exports = router;
