const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Location = sequelize.define('Location', {
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
    lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
    },
    lon: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
    },
}, {
    tableName: 'saved_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = Location;
