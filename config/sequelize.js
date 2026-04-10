require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME     || 'weatherwize',
    process.env.DB_USER     || 'root',
    process.env.DB_PASSWORD || 'password',
    {
        host:    process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
        define: {
            underscored: true, // maps camelCase fields → snake_case columns
        },
    }
);

module.exports = sequelize;
