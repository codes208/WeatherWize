const { Setting } = require('../models');

exports.getSettings = async (req, res) => {
    try {
        const rows = await Setting.findAll();
        const settings = {};
        rows.forEach(row => {
            settings[row.settingKey] = row.settingValue;
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { maintenance_mode, api_throttle_limit } = req.body;

        if (maintenance_mode !== undefined) {
            const val = maintenance_mode === true || maintenance_mode === 'true' ? 'true' : 'false';
            await Setting.upsert({ settingKey: 'maintenance_mode', settingValue: val });
        }

        if (api_throttle_limit !== undefined) {
            const throttle = parseInt(api_throttle_limit, 10);
            if (isNaN(throttle) || throttle < 0) {
                return res.status(400).json({ message: 'API throttle limit must be a non-negative integer.' });
            }
            await Setting.upsert({ settingKey: 'api_throttle_limit', settingValue: throttle.toString() });
        }

        res.json({ message: 'System configuration saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while saving settings' });
    }
};
