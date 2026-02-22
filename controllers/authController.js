const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const VALID_ROLES = new Set(['admin', 'general', 'advanced']);
const SELF_REGISTRATION_ROLES = new Set(['general', 'advanced']);

exports.register = async (req, res) => {
    try {
        const username = req.body.username?.trim();
        const password = req.body.password;
        const requestedRole = (req.body.role || 'general').toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (!SELF_REGISTRATION_ROLES.has(requestedRole)) {
            return res.status(400).json({ message: 'Role must be general or advanced for self-registration' });
        }

        const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, requestedRole]
        );

        res.status(201).json({ message: 'User registered successfully' });
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
            'SELECT id, username, password, role FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

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
            user: { id: user.id, username: user.username, role: user.role }
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
