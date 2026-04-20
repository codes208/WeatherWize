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
        const { maintenance_mode } = req.body;

        if (maintenance_mode !== undefined) {
            const val = maintenance_mode === true || maintenance_mode === 'true' ? 'true' : 'false';
            await Setting.upsert({ settingKey: 'maintenance_mode', settingValue: val });
        }

        res.json({ message: 'System configuration saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while saving settings' });
    }
};
