require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const authRoutes     = require('./routes/auth');
const weatherRoutes  = require('./routes/weather');
const alertsRoutes   = require('./routes/alerts');
const settingsRoutes = require('./routes/settings');

const { Setting } = require('./models');
const globalState = require('./config/state');
require('./services/alertWorker');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: async () => globalState.apiThrottleLimit,
    message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Maintenance Mode (blocks non-admins when active)
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/settings') || req.path.startsWith('/api/auth/login')) {
        return next();
    }

    try {
        const setting = await Setting.findOne({ where: { settingKey: 'maintenance_mode' } });
        if (setting && setting.settingValue === 'true') {
            const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.role === 'admin') return next();
                } catch (e) {
                    if (req.path.startsWith('/api/')) {
                        return res.status(401).json({ message: 'Token expired. Please re-authenticate.' });
                    }
                }
            }
            if (req.path.startsWith('/api/')) {
                return res.status(503).json({ message: 'System is currently under maintenance. Please check back later.' });
            }
            return res.status(503).send(`
                <!DOCTYPE html>
                <html><head><title>Maintenance - WeatherWize</title>
                <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;color:#fff;text-align:center;}
                .box{padding:60px;border-radius:16px;background:rgba(255,255,255,0.05);}h1{font-size:2rem;margin-bottom:10px;}p{color:#aaa;}</style></head>
                <body><div class="box"><h1>🔧 Down for Maintenance</h1><p>WeatherWize is temporarily offline. Please check back later.</p></div></body></html>
            `);
        }
    } catch (e) {}
    next();
});

// Static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/weather',  weatherRoutes);
app.use('/api/alerts',   alertsRoutes);
app.use('/api/settings', settingsRoutes);

// Root → login page
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Dashboard — rendered by EJS based on role from JWT cookie
app.get('/dashboard', (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;

        if (role === 'admin') return res.redirect('/admin-dashboard.html');

        res.render('dashboard', { role });
    } catch (e) {
        res.clearCookie('token');
        res.redirect('/');
    }
});

// Static HTML views (non-EJS pages)
app.use(express.static(path.join(__dirname, 'views')));

// Start Server
app.listen(PORT, async () => {
    try {
        const setting = await Setting.findOne({ where: { settingKey: 'api_throttle_limit' } });
        if (setting) {
            globalState.apiThrottleLimit = parseInt(setting.settingValue, 10) || 500;
        }
    } catch (e) {
        console.log('Could not load api_throttle_limit from DB, using default.');
    }
    console.log(`Server running on http://localhost:${PORT}`);
});
