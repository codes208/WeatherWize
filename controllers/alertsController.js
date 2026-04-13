const { Op } = require('sequelize');
const { Alert, Notification } = require('../models');

exports.createAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const { location_name, trigger_type, threshold } = req.body;

        if (!location_name || !trigger_type || threshold === undefined || threshold === '') {
            return res.status(400).json({ message: 'Please fill in all fields (location, trigger type, and threshold value).' });
        }

        const thresholdNum = Number(threshold);
        if (isNaN(thresholdNum)) {
            return res.status(400).json({ message: 'Threshold must be a valid number.' });
        }

        const existing = await Alert.findOne({
            where: { userId, locationName: location_name, triggerType: trigger_type, thresholdValue: thresholdNum },
        });
        if (existing) {
            return res.status(409).json({ message: 'An identical alert already exists for this location.' });
        }

        await Alert.create({
            userId,
            locationName:   location_name,
            triggerType:    trigger_type,
            thresholdValue: thresholdNum,
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
            threshold_value: a.thresholdValue,
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
