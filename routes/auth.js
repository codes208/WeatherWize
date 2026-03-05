/**
 * @file routes/auth.js
 * @description Authentication and admin user management routes.
 *
 * Public:  POST /register, POST /login, POST /forgot-password
 * Auth:    PUT  /profile
 * Admin:   GET  /users, GET  /stats, PUT /users/:id/role, PUT /users/:id/status
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);

// Authenticated user profile
router.put('/profile', authMiddleware, authController.updateProfile);

// Admin-only role and user management.
router.get('/users', authMiddleware, authMiddleware.requireRole('admin'), authController.getAllUsers);
router.get('/stats', authMiddleware, authMiddleware.requireRole('admin'), authController.getDashboardStats);
router.put('/users/:id/role', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserRole);
router.put('/users/:id/status', authMiddleware, authMiddleware.requireRole('admin'), authController.updateUserStatus);

module.exports = router;
