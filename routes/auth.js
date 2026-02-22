const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Admin-only role management.
router.put('/users/:id/role', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserRole);

module.exports = router;
