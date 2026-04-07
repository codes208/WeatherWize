const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateAlert } = require('../middleware/validationMiddleware');

// All alert routes require auth + advanced or admin role
router.post('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), validateAlert, alertsController.createAlert);
router.get('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.getAlerts);
router.delete('/:id', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.deleteAlert);

// Notification endpoints for background alerts
router.get('/notifications', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.getNotifications);
router.post('/notifications/read', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.markNotificationsRead);

module.exports = router;
