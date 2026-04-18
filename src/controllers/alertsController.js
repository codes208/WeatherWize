const { Op } = require('sequelize');
const { Alert, Notification } = require('../models');

// Whitelisted trigger types — must match alertWorker.js switch cases
const VALID_TRIGGER_TYPES = new Set(['Temperature', 'Humidity', 'Wind Speed']);

exports.createAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const { location_name, trigger_type, threshold_min, threshold_max } = req.body;

        if (!location_name || !trigger_type || threshold_min === undefined || threshold_min === '' || threshold_max === undefined || threshold_max === '') {
            return res.status(400).json({ message: 'Please fill in all fields (location, metric, min, and max).' });
        }

        if (!VALID_TRIGGER_TYPES.has(trigger_type)) {
            return res.status(400).json({ message: 'Invalid trigger type. Must be Temperature, Humidity, or Wind Speed.' });
        }

        const min = Number(threshold_min);
        const max = Number(threshold_max);
        if (isNaN(min) || isNaN(max)) {
            return res.status(400).json({ message: 'Min and max must be valid numbers.' });
        }
        if (min >= max) {
            return res.status(400).json({ message: 'Min value must be less than max value.' });
        }

        const existing = await Alert.findOne({
            where: { userId, locationName: location_name, triggerType: trigger_type, thresholdValue: min, thresholdMax: max },
        });
        if (existing) {
            return res.status(409).json({ message: 'An identical alert already exists for this location.' });
        }

        await Alert.create({
            userId,
            locationName:   location_name,
            triggerType:    trigger_type,
            thresholdValue: min,
            thresholdMax:   max,
        });

        res.status(201).json({ message: 'Alert saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while creating alert' });
    }
};

exports.getAlerts = async (req, res) => {
    try {
        const userId = req.user.id;
        const alerts = await Alert.findAll({
            where: { userId },
            order: [['created_at', 'DESC']],
        });
        res.json(alerts.map(a => ({
            id:              a.id,
            user_id:         a.userId,
            location_name:   a.locationName,
            trigger_type:    a.triggerType,
            threshold_value: Number(a.thresholdValue),
            threshold_max:   Number(a.thresholdMax),
            is_active:       a.isActive,
            created_at:      a.createdAt,
        })));

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching alerts' });
    }
};

exports.enableAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = Number(req.params.id);

        if (!Number.isInteger(alertId) || alertId <= 0) {
            return res.status(400).json({ message: 'Invalid alert id' });
        }

        const alert = await Alert.findOne({ where: { id: alertId, userId } });
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        await alert.update({ isActive: true, lastTriggeredAt: null });
        res.json({ message: 'Alert re-enabled successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while enabling alert' });
    }
};

exports.disableAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = Number(req.params.id);

        if (!Number.isInteger(alertId) || alertId <= 0) {
            return res.status(400).json({ message: 'Invalid alert id' });
        }

        const alert = await Alert.findOne({ where: { id: alertId, userId } });
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        await alert.update({ isActive: false });
        res.json({ message: 'Alert disabled.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while disabling alert' });
    }
};

exports.deleteAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = Number(req.params.id);

        if (!Number.isInteger(alertId) || alertId <= 0) {
            return res.status(400).json({ message: 'Invalid alert id' });
        }

        const deleted = await Alert.destroy({ where: { id: alertId, userId } });

        if (deleted === 0) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while deleting alert' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.findAll({
            where: { userId, isRead: false },
            order: [['created_at', 'ASC']],
        });
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

exports.markNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ message: 'No notification IDs provided' });
        }

        const ids = notificationIds.filter(id => Number.isInteger(Number(id)));
        if (ids.length === 0) return res.json({ message: 'No valid IDs' });

        await Notification.update(
            { isRead: true },
            { where: { userId, id: { [Op.in]: ids } } }
        );

        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error marking read' });
    }
};

/**
 * Renders the alerts-manager EJS view with the current user's alerts.
 * Separated from the API layer so server.js stays free of DB logic.
 */
exports.renderAlertsManager = async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            where: { userId: req.user.id },
            order: [['created_at', 'DESC']],
        });

        res.render('alerts-manager', {
            alerts: alerts.map(a => ({
                id:              a.id,
                location_name:   a.locationName,
                trigger_type:    a.triggerType,
                threshold_value: Number(a.thresholdValue),
                threshold_max:   Number(a.thresholdMax),
                is_active:       a.isActive,
            })),
        });
    } catch (e) {
        console.error('Error rendering alerts-manager:', e);
        res.status(500).send('<h1>Unable to load Alerts Manager</h1><p>Please try again later.</p>');
    }
};

exports.getSystemRecentAlerts = async (req, res) => {
    try {
        const { User } = require('../models');
        const alerts = await Alert.findAll({
            where: {
                isActive: false,
                lastTriggeredAt: { [Op.ne]: null },
            },
            order: [['lastTriggeredAt', 'DESC']],
            limit: 10,
            include: [{ model: User, attributes: ['username'] }],
        });

        res.json(alerts.map(a => ({
            id:                a.id,
            location_name:     a.locationName,
            trigger_type:      a.triggerType,
            threshold_value:   Number(a.thresholdValue),
            last_triggered_at: a.lastTriggeredAt,
            username:          a.User?.username || 'Unknown',
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching system alerts' });
    }
};
