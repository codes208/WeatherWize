const { body, validationResult } = require('express-validator');

// Validation execution bridge
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Format errors into a single string for frontend toast.js
        const extractedErrors = [];
        errors.array().map(err => extractedErrors.push(err.msg));
        
        return res.status(400).json({
            message: extractedErrors.join(' | '),
            errors: errors.array()
        });
    };
};

module.exports = {
    validateRegister: validate([
        body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').isEmail().withMessage('Please provide a valid email address'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        body('role').optional().isIn(['general', 'advanced']).withMessage('Invalid role selected')
    ]),

    validateLogin: validate([
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ]),

    validateAlert: validate([
        body('location_name').trim().notEmpty().withMessage('Location name is required'),
        body('trigger_type').trim().notEmpty().withMessage('Trigger type is required'),
        body('threshold').isNumeric().withMessage('Threshold must be a precise number')
    ])
};
