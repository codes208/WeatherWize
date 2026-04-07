/**
 * @file controllers/alertsController.js
 * @description Weather alerts controller (advanced/admin only).
 *
 * Exports:
 *  - createAlert  — Create a new weather alert for a location with
 *                   a trigger type (temp_above, temp_below, wind_above,
 *                   humidity_above) and threshold value.
 *  - getAlerts    — List all alerts belonging to the authenticated user.
 *  - deleteAlert  — Delete an alert by ID (owner-only).
 */
const db = require('../config/db');

// Create a new alert
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

        await db.query(
            'INSERT INTO alerts (user_id, location_name, trigger_type, threshold_value) VALUES (?, ?, ?, ?)',
            [userId, location_name, trigger_type, thresholdNum]
        );

        res.status(201).json({ message: 'Alert saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while creating alert' });
    }
};

// Get all alerts for the authenticated user
exports.getAlerts = async (req, res) => {
    try {
        const userId = req.user.id;
        const [alerts] = await db.query(
            'SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(alerts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching alerts' });
    }
};

// Delete an alert
exports.deleteAlert = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = Number(req.params.id);

        if (!Number.isInteger(alertId) || alertId <= 0) {
            return res.status(400).json({ message: 'Invalid alert id' });
        }

        const [result] = await db.query(
            'DELETE FROM alerts WHERE id = ? AND user_id = ?',
            [alertId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while deleting alert' });
    }
};

// Fetch unread notifications for the user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at ASC',
            [userId]
        );
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

// Mark notifications as read
exports.markNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;
        
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ message: 'No notification IDs provided' });
        }

        const ids = notificationIds.filter(id => Number.isInteger(Number(id)));
        if (ids.length === 0) return res.json({ message: 'No valid IDs' });

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (?)',
            [userId, ids]
        );

        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error marking read' });
    }
};
