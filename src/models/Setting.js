const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Setting = sequelize.define('Setting', {
    settingKey: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        field: 'setting_key',
    },
    settingValue: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'setting_value',
    },
}, {
    tableName: 'system_settings',
    timestamps: false,
});

module.exports = Setting;
