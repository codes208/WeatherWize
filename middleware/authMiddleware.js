/**
 * @file middleware/authMiddleware.js
 * @description JWT authentication middleware and role-based access control.
 *
 * Exports a middleware function `authenticate` that:
 *  1. Extracts the Bearer token from the Authorization header
 *  2. Verifies it against JWT_SECRET
 *  3. Attaches the decoded payload to req.user
 *
 * Also provides `authenticate.requireRole(...roles)` — a higher-order
 * middleware that restricts access to users whose role matches one of
 * the specified roles. Must be used AFTER authenticate.
 */
const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization header and attaches decoded user to req.user.
 * Returns 401 if token is missing or invalid.
 */
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token is not valid' });
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
