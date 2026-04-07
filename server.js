/**
 * @file server.js
 * @description Express application entry point for WeatherWize.
 *
 * Responsibilities:
 *  - Loads environment variables from .env
 *  - Configures Express middleware (CORS, JSON parsing)
 *  - Implements global maintenance-mode middleware (UC-014) that blocks
 *    non-admin requests when maintenance_mode is enabled in system_settings
 *  - Serves the static frontend from /public
 *  - Mounts API route handlers for auth, weather, alerts, and settings
 *  - Starts the HTTP server on the configured PORT
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const alertsRoutes = require('./routes/alerts');
const settingsRoutes = require('./routes/settings');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Add new feature dependencies
const rateLimit = require('express-rate-limit');
const globalState = require('./config/state');
require('./services/alertWorker');

// Middleware
app.use(cors());
app.use(express.json());

// API Rate Limiting (UC-014 fix)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: async () => globalState.apiThrottleLimit,
    message: { message: "Too many requests from this IP, please try again later." }
});
app.use('/api', limiter);

// Maintenance-mode middleware (UC-014): blocks non-admin users when enabled
app.use(async (req, res, next) => {
    // Skip for API settings route (so admin can toggle it off) and static assets
    if (req.path.startsWith('/api/settings') || req.path.startsWith('/api/auth/login')) {
        return next();
    }

    try {
        const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_mode'");
        if (rows.length > 0 && rows[0].setting_value === 'true') {
            // Check if user is admin via JWT (if token present)
            const jwt = require('jsonwebtoken');
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.role === 'admin') return next();
                } catch (e) { /* token invalid, block */ }
            }
            // For API requests, return JSON
            if (req.path.startsWith('/api/')) {
                return res.status(503).json({ message: 'System is currently under maintenance. Please check back later.' });
            }
            // For HTML page requests, return maintenance page
            return res.status(503).send(`
                <!DOCTYPE html>
                <html><head><title>Maintenance - WeatherWize</title>
                <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;color:#fff;text-align:center;}
                .box{padding:60px;border-radius:16px;background:rgba(255,255,255,0.05);}h1{font-size:2rem;margin-bottom:10px;}p{color:#aaa;}</style></head>
                <body><div class="box"><h1>🔧 Down for Maintenance</h1><p>WeatherWize is temporarily offline. Please check back later.</p></div></body></html>
            `);
        }
    } catch (e) {
        // If system_settings table doesn't exist yet, skip maintenance check
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_throttle_limit'");
        if (rows.length > 0) {
            globalState.apiThrottleLimit = parseInt(rows[0].setting_value, 10) || 500;
        }
    } catch (e) {
        console.log('Could not load api_throttle_limit from DB, using default.');
    }
    console.log(`Server running on http://localhost:${PORT}`);
});

