const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// POST /api/auth/login
// incoming: login, password
// outgoing: id, firstName, lastName, error
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                id: -1,
                firstName: "",
                lastName: "",
                error: "Username and password is required"
            });
        }

        // password is excluded from queries by default, so ask for it explicitly
        const foundUser = await User.findOne({ login: String(login) }).select("+password");

        if (!foundUser || !(await foundUser.checkPassword(String(password)))) {
            return res.status(401).json({
                id: -1,
                firstName: "",
                lastName: "",
                error: "Login/Password incorrect"
            });
        }

        return res.status(200).json({
            id: foundUser._id,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            error: ""
        });
    }   catch (error) {
        console.log(error);
        return res.status(500).json(
            {
                id: -1,
                firstName: "",
                lastName: "",
                error: "Error logging in"
            }
        );
    }
});

// POST /api/auth/register
// incoming: firstName, lastName, login, password, email
// outgoing: id, message, error
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, login, password, email } = req.body || {};

        if (typeof login !== "string" || typeof password === "string") {
            return res.status(400).json({
                id: -1,
                message: "",
                error: "Username and password must both be strings"
            });
        }

        if (!login || !password) {
            return res.status(400).json({
                id: -1,
                message: "",
                error: "Username and password is required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                id: -1,
                message: "",
                error: "Password must be at least 8 characters"
            });
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
    }   catch (error) {
        console.log(error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            if (field === "login") {
                return res.status(409).json(
                    {
                        id: -1,
                        message: "",
                        error: `User with this login already exists`
                    }
                );
            }
            return res.status(400).json(
                {
                    id: -1,
                    message: "",
                    error: "Unable to register with the provided details"
                }
            );
        }

        if (error.name === "ValidationError") {
            const first = Object.values(error.errors)[0];
            return res.status(400).json(
                {
                    id: -1,
                    message: "",
                    error: first.message
                }
            );
        }

        return res.status(500).json(
            {
                id: -1,
                message: "",
                error: "Error registering user"
            }
        );
    }
});

function cleanValue(value) {
    if (value === undefined || value === null) return undefined;

    const trimmed = String(value).trim();
    return trimmed === "" ? undefined : trimmed;
}

module.exports = router;
