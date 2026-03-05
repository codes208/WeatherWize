/**
 * @file routes/settings.js
 * @description System settings routes (admin only).
 *
 * GET / — retrieve all settings, PUT / — update settings.
 */
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');

// Admin-only settings routes
router.get('/', authMiddleware, authMiddleware.requireRole('admin'), settingsController.getSettings);
router.put('/', authMiddleware, authMiddleware.requireRole('admin'), settingsController.updateSettings);

module.exports = router;
