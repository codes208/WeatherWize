const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
    },
    locationName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'location_name',
    },
    triggerType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'trigger_type',
    },
    thresholdValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'threshold_value',
    },
    thresholdMax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'threshold_max',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    },
    lastTriggeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_triggered_at',
    },
}, {
    tableName: 'alerts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = Alert;
