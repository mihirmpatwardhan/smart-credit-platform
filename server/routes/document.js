const express = require('express');
const router = express.Router();
const { uploadDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/upload', protect, uploadDocument);

module.exports = router;
