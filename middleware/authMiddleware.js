const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verifies JWT from Authorization header and attaches decoded user to req.user.
 * Returns 401 if token is missing or invalid.
 * Returns 403 if user account has been suspended.
 */
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Live suspension check — ensures suspended users are rejected immediately
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
