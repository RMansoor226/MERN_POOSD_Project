const express = require('express');
const { User } = require('../../models');
const AppError = require("../utils/AppError");

const router = express.Router();

// POST /api/auth/login
// incoming: login, password
// outgoing: id, firstName, lastName, error
router.post('/login', async (req, res) => {
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
        error: ""
    });
});

// POST /api/auth/register
// incoming: firstName, lastName, login, password, email
// outgoing: id, message, error
router.post('/register', async (req, res) => {
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

function cleanValue(value) {
    if (value === undefined || value === null) return undefined;

    const trimmed = String(value).trim();
    return trimmed === "" ? undefined : trimmed;
}

module.exports = router;
