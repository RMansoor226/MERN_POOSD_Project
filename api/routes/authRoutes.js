const express = require('express');
const { User } = require('../../models');
const AppError = require('../utils/AppError');
const cleanValue = require('../utils/cleanValue');
const { signToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/authSchemas');

const router = express.Router();

// POST /api/auth/login
// incoming: login, password
// outgoing: id, firstName, lastName, error
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    const { login, password } = req.body ?? {};

    if (typeof login !== "string" || typeof password !== "string") {
        throw new AppError(400, "Username and password must both be strings");
    }

    if (!login.trim() || !password) {
        throw new AppError(400, "Username and password is required");
    }

    // password is excluded from queries by default, so ask for it explicitly
    const foundUser = await User.findOne({ login }).select("+password");

    if (!foundUser || !(await foundUser.checkPassword(password))) {
        throw new AppError(401, "Login/Password incorrect");
    }

    return res.status(200).json({
        id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        token: signToken(foundUser),
        error: ''
    });
});

// POST /api/auth/register
// incoming: firstName, lastName, login, password, email
// outgoing: id, message, error
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
    const { firstName, lastName, login, password, email } = req.body || {};

    if (typeof login !== "string" || typeof password !== "string") {
        throw new AppError(400, "Username and password must both be strings");
    }

    if (!login || !password) {
        throw new AppError(400, "Username and password is required");
    }

    if (password.length < 8) {
        throw new AppError(400, "Password must be at least 8 characters");
    }

    // the User model's pre-save hook hashes the password
    const newUser = await User.create({
        firstName: cleanValue(firstName),
        lastName: cleanValue(lastName),
        login: String(login),
        password: String(password),
        email: cleanValue(email)
    });

    return res.status(201).json({
        id: newUser._id,
        message: "User registered successfully",
        error: ""
    });
});

module.exports = router;
