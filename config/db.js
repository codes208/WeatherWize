/**
 * @file config/db.js
 * @description MySQL connection pool using mysql2/promise.
 *
 * Creates a reusable pool with a max of 10 connections.
 * Connection credentials are loaded from environment variables
 * with sensible defaults for local development.
 *
 * Usage: const db = require('./config/db');
 *        const [rows] = await db.query('SELECT ...');
 */
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'weatherwize',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
