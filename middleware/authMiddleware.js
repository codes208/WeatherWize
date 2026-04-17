const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authentication middleware — verifies the JWT from the Authorization header
 * and attaches the decoded payload to req.user for downstream handlers.
 *
 * Why a live DB lookup on every request?
 *   The JWT alone can't be revoked once issued. By checking the user's status
 *   in the database on every authenticated request, we ensure that suspended
 *   accounts are blocked immediately — without waiting for the token to expire.
 *   The trade-off is one extra DB query per request, which is acceptable given
 *   that suspension is a critical security action.
 *
 * Returns 401 if token is missing or invalid.
 * Returns 403 if the account has been suspended.
 */
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Live suspension check — JWT alone cannot be revoked, so we verify
        // the account is still active on every request.
        const user = await User.findByPk(decoded.id, { attributes: ['id', 'status'] });
        if (!user || user.status === 'suspended') {
            return res.status(403).json({ message: 'Account suspended', suspended: true });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token is not valid' });
        }
        return res.status(500).json({ message: 'Authentication error' });
    }
};

/**
 * Role-based access control middleware factory.
 * Usage: authMiddleware.requireRole('admin') or authMiddleware.requireRole('advanced', 'admin')
 * Must be used after authenticate() since it relies on req.user being set.
 */
authenticate.requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied: no role found' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied: requires role ${roles.join(' or ')}`
            });
        }

        next();
    };
};

module.exports = authenticate;
