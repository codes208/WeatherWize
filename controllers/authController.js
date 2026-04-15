const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Location } = require('../models');

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

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        if (!SELF_REGISTRATION_ROLES.has(requestedRole)) {
            return res.status(400).json({ message: 'Role must be general or advanced for self-registration' });
        }

        const existingUser = await User.findOne({
            where: { [Op.or]: [{ username }, { email }] },
        });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email is already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, password: hashedPassword, email, role: requestedRole });

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, { httpOnly: false, sameSite: 'strict', maxAge: 60 * 60 * 1000 });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
        });
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

        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

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

        res.cookie('token', token, { httpOnly: false, sameSite: 'strict', maxAge: 60 * 60 * 1000 });
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
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
                message: 'Action prohibited: You cannot demote your own administrative account to prevent system lockouts.',
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ role });

        res.json({
            message: 'User role updated successfully',
            user: { id: user.id, username: user.username, role },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating role' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'status'],
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, password } = req.body;

        if (!email && !password) {
            return res.status(400).json({ message: 'Please provide an email or new password to update.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Please enter a valid email address.' });
            }
            const taken = await User.findOne({ where: { email: email.trim(), id: { [Op.ne]: userId } } });
            if (taken) {
                return res.status(409).json({ message: 'User email already in use.' });
            }
            await user.update({ email: email.trim() });
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(password, 10);
            await user.update({ password: hashed });
        }

        await user.reload();
        res.json({
            message: 'Profile updated successfully.',
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const username = req.body.username?.trim();
        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        const user = await User.findOne({ where: { username } });
        if (user) {
            const resetToken = require('crypto').randomBytes(32).toString('hex');
            console.log(`[FORGOT PASSWORD] Reset token for user "${username}": ${resetToken}`);
        }

        res.json({ message: 'If an account with that username exists, reset instructions have been sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, premiumUsers, totalLocations, suspendedUsers] = await Promise.all([
            User.count({ where: { status: 'active' } }),
            User.count({ where: { role: 'advanced', status: 'active' } }),
            Location.count(),
            User.count({ where: { status: 'suspended' } }),
        ]);

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

        // Prevent self-suspension
        if (req.user.id === userId && status === 'suspended') {
            return res.status(403).json({ message: 'You cannot suspend your own account.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ status });

        res.json({
            message: 'User status updated successfully',
            user: { id: user.id, username: user.username, status },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating status' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        // Prevent self-deletion
        if (req.user.id === userId) {
            return res.status(403).json({ message: 'You cannot delete your own account.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while deleting user' });
    }
};
