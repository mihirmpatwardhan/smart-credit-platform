const express = require('express');
const router = express.Router();
const {
  getAllApplications, getRules, updateRules, getAllUsers, getAuditLogs,
  stressTestRules, getLoanProducts, createLoanProduct, updateLoanProduct,
  toggleLoanProductActive, deleteLoanProduct, updateApplicationStatus
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/applications', protect, admin, getAllApplications);
router.put('/applications/:id', protect, admin, updateApplicationStatus);
router.get('/users', protect, admin, getAllUsers);
router.get('/rules', protect, admin, getRules);
router.put('/rules', protect, admin, updateRules);
router.get('/audit-logs', protect, admin, getAuditLogs);
router.post('/stress-test', protect, admin, stressTestRules);

router.route('/loan-products')
  .get(protect, admin, getLoanProducts)
  .post(protect, admin, createLoanProduct);
  
router.route('/loan-products/:id')
  .put(protect, admin, updateLoanProduct)
  .delete(protect, admin, deleteLoanProduct);

// Quick toggle for active/inactive without full edit
router.patch('/loan-products/:id/toggle', protect, admin, toggleLoanProductActive);

module.exports = router;
