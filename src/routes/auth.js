const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/dashboard', authController.renderDashboard);

// Authenticated user profile
router.put('/profile', authMiddleware, authController.updateProfile);
router.delete('/profile', authMiddleware, authController.suspendSelf);

// Admin-only role and user management.
router.get('/users', authMiddleware, authMiddleware.requireRole('admin'), authController.getAllUsers);
router.get('/stats', authMiddleware, authMiddleware.requireRole('admin'), authController.getDashboardStats);
router.put('/users/:id/role', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserRole);
router.put('/users/:id/status', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserStatus);
router.delete('/users/:id', authMiddleware, authMiddleware.requireRole('admin'), authController.deleteUser);

module.exports = router;
