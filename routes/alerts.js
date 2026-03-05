const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const authMiddleware = require('../middleware/authMiddleware');

// All alert routes require auth + advanced or admin role
router.post('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.createAlert);
router.get('/', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.getAlerts);
router.delete('/:id', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.deleteAlert);

module.exports = router;
