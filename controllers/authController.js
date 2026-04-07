/**
 * @file controllers/authController.js
 * @description Authentication and user management controller.
 *
 * Exports:
 *  - register        — Create a new user (general/advanced). Validates password
 *                      strength (min 6 chars), enforces username + email uniqueness,
 *                      hashes password with bcrypt, returns JWT for auto-login.
 *  - login           — Authenticates user, blocks suspended accounts (403), returns JWT.
 *  - forgotPassword  — Stub for password-reset email flow.
 *  - updateProfile   — Lets authenticated user update their email/password.
 *  - getAllUsers      — (Admin) Lists all users for the management table.
 *  - getDashboardStats — (Admin) Returns aggregate counts for the admin dashboard.
 *  - updateUserRole   — (Admin) Change a user's role. Prevents admin self-demotion.
 *  - updateUserStatus — (Admin) Suspend or unsuspend a user account.
 */
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const VALID_ROLES = new Set(['admin', 'general', 'advanced']);
const SELF_REGISTRATION_ROLES = new Set(['general', 'advanced']);

exports.register = async (req, res) => {
    try {
        const username = req.body.username?.trim();
        const password = req.body.password;
        const email = req.body.email?.trim() || null;
        const requestedRole = (req.body.role || 'general').toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        if (!SELF_REGISTRATION_ROLES.has(requestedRole)) {
            return res.status(400).json({ message: 'Role must be general or advanced for self-registration' });
        }

        // Check both username and email uniqueness
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Username or email is already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, requestedRole]
        );

        // Auto-login: generate token so frontend can start a session immediately
        const newUser = { id: result.insertId, username, email, role: requestedRole };
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({ message: 'User registered successfully', token, user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    try {
        const username = req.body.username?.trim();
        const password = req.body.password;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const [users] = await db.query(
            'SELECT id, username, password, email, role, status FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Block suspended accounts
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'This account has been suspended by an administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        if (!VALID_ROLES.has(role)) {
            return res.status(400).json({ message: 'Invalid role. Use admin, general, or advanced.' });
        }

        // Self-demotion guard (UC-012)
        if (req.user.id === userId && role !== 'admin') {
            return res.status(403).json({
                message: 'Action prohibited: You cannot demote your own administrative account to prevent system lockouts.'
            });
        }

        const [users] = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

        res.json({
            message: 'User role updated successfully',
            user: {
                id: users[0].id,
                username: users[0].username,
                role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating role' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, role, status FROM users'
        );
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
};

// UC-015: Update own profile (email and/or password)
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, password } = req.body;

        if (!email && !password) {
            return res.status(400).json({ message: 'Please provide an email or new password to update.' });
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Please enter a valid email address.' });
            }
            const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), userId]);
            if (existing.length > 0) {
                return res.status(409).json({ message: 'User email already in use.' });
            }
            await db.query('UPDATE users SET email = ? WHERE id = ?', [email.trim(), userId]);
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
        }

        // Fetch updated user to return
        const [rows] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [userId]);
        res.json({ message: 'Profile updated successfully.', user: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
};

// UC-004: Forgot password (stub — logs token, returns generic message)
exports.forgotPassword = async (req, res) => {
    try {
        const username = req.body.username?.trim();
        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        // Always return same message to prevent enumeration
        const [users] = await db.query('SELECT id, email FROM users WHERE username = ?', [username]);
        if (users.length > 0) {
            const resetToken = require('crypto').randomBytes(32).toString('hex');
            console.log(`[FORGOT PASSWORD] Reset token for user "${username}": ${resetToken}`);
        }

        res.json({ message: 'If an account with that username exists, reset instructions have been sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// UC-011: Admin dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users WHERE status = "active"');
        const [[{ premiumUsers }]] = await db.query('SELECT COUNT(*) AS premiumUsers FROM users WHERE role = "advanced" AND status = "active"');
        const [[{ totalLocations }]] = await db.query('SELECT COUNT(*) AS totalLocations FROM saved_locations');
        const [[{ suspendedUsers }]] = await db.query('SELECT COUNT(*) AS suspendedUsers FROM users WHERE status = "suspended"');

        res.json({ totalUsers, premiumUsers, totalLocations, suspendedUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        if (status !== 'active' && status !== 'suspended') {
            return res.status(400).json({ message: 'Invalid status. Use active or suspended.' });
        }

        const [users] = await db.query('SELECT id, username FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

        res.json({
            message: 'User status updated successfully',
            user: {
                id: users[0].id,
                username: users[0].username,
                status
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating status' });
    }
};
