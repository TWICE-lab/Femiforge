const express = require('express');
const router = express.Router();
const { login, getMe, logout, initAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/init-admin', initAdmin);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;