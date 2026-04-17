const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateAlert } = require('../middleware/validationMiddleware');

// All alert routes require auth + advanced or admin role
router.post('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), validateAlert, alertsController.createAlert);
router.get('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.getAlerts);
router.delete('/:id', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.deleteAlert);
router.patch('/:id/enable', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.enableAlert);
router.patch('/:id/disable', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.disableAlert);

// Server-rendered alerts manager page
router.get('/manager', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.renderAlertsManager);

// Admin-only: recently triggered alerts across all users
router.get('/system-recent', authMiddleware, authMiddleware.requireRole('admin'), alertsController.getSystemRecentAlerts);

// Notification endpoints (all authenticated users — poller runs on every page)
router.get('/notifications', authMiddleware, alertsController.getNotifications);
router.post('/notifications/read', authMiddleware, alertsController.markNotificationsRead);

module.exports = router;
