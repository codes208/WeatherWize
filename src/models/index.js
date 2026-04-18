const sequelize = require('../config/sequelize');
const User         = require('./User');
const Location     = require('./Location');
const Alert        = require('./Alert');
const Notification = require('./Notification');
const Setting      = require('./Setting');

// Associations
User.hasMany(Location,     { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(Alert,        { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });

Location.belongsTo(User,     { foreignKey: 'user_id' });
Alert.belongsTo(User,        { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, Location, Alert, Notification, Setting };
