const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Admin-only role and user management.
router.get('/users', authMiddleware, authMiddleware.requireRole('admin'), authController.getAllUsers);
router.put('/users/:id/role', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserRole);
router.put('/users/:id/status', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserStatus);

module.exports = router;
