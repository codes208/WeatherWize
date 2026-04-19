const jwt = require('jsonwebtoken');
const { Setting } = require('../models');

// Paths that are always accessible, even during maintenance
const WHITELIST = [
    '/',
    '/forgot-password',
    '/select-account-type',
    '/register-general-user',
    '/register-advanced-user',
];

const WHITELIST_PREFIXES = [
    '/css/',
    '/js/',
    '/images/',
    '/api/settings',
    '/api/auth/login',
    '/api/auth/register',
];

/**
 * Maintenance mode middleware — blocks all non-admin traffic when maintenance
 * mode is enabled in the database. Admins pass through by presenting a valid JWT.
 */
module.exports = async (req, res, next) => {
    if (
        WHITELIST.includes(req.path) ||
        WHITELIST_PREFIXES.some(prefix => req.path.startsWith(prefix))
    ) {
        return next();
    }

    try {
        const setting = await Setting.findOne({ where: { settingKey: 'maintenance_mode' } });
        if (!setting || setting.settingValue !== 'true') return next();

        // Allow admins through by verifying their JWT
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.query?.token;
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

        return res.status(503).render('maintenance');
    } catch (e) {
        next();
    }
};
