require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes      = require('./routes/auth');
const authController  = require('./controllers/authController');
const weatherRoutes   = require('./routes/weather');
const alertsRoutes    = require('./routes/alerts');
const settingsRoutes  = require('./routes/settings');

const alertsController = require('./controllers/alertsController');
const authMiddleware   = require('./middleware/authMiddleware');

const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');
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
app.use(maintenanceMiddleware);

// Static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/weather',  weatherRoutes);
app.use('/api/alerts',   alertsRoutes);
app.use('/api/settings', settingsRoutes);

// Simple EJS page routes
const simplePages = [
    'index', 'profile', 'locations', 'map', 'historical-data',
    'settings', 'admin-users', 'forgot-password', 'select-account-type',
    'register-general-user', 'register-advanced-user', 'weather-details'
];
simplePages.forEach(page => {
    const route = page === 'index' ? '/' : `/${page}`;
    app.get(route, (_req, res) => res.render(page));
});

// Dashboard — role-based render handled by authController
app.get('/dashboard', authController.renderDashboard);

// Admin dashboard — stats and recent alerts rendered server-side
app.get('/admin-dashboard', alertsController.renderAdminDashboard);

// Alerts Manager — server-rendered page, auth handled via query token
app.get('/alerts-manager', authMiddleware, authMiddleware.requireRole('advanced', 'admin'), alertsController.renderAlertsManager);

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
