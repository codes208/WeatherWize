const db = require('../config/db');

// Get all system settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM system_settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching settings' });
    }
};

// Update system settings
exports.updateSettings = async (req, res) => {
    try {
        const { maintenance_mode, api_throttle_limit } = req.body;

        if (maintenance_mode !== undefined) {
            const val = maintenance_mode === true || maintenance_mode === 'true' ? 'true' : 'false';
            await db.query(
                'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['maintenance_mode', val, val]
            );
        }

        if (api_throttle_limit !== undefined) {
            const num = Number(api_throttle_limit);
            if (isNaN(num) || num < 1) {
                return res.status(400).json({ message: 'API throttle limit must be a positive number.' });
            }
            await db.query(
                'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['api_throttle_limit', String(num), String(num)]
            );
        }

        res.json({ message: 'System configuration saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while saving settings' });
    }
};
