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

        res.status(200).json({
            id: foundUser._id,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            error: ""
        });
    }   catch (error) {
        console.log(error);
        res.status(500).json(
            {
                id: -1,
                firstName: "",
                lastName: "",
                error: "Error logging in"
            }
        )
    }
});

// POST /api/auth/register
// incoming: firstName, lastName, login, password, email
// outgoing: id, message, error
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, login, password, email } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                id: -1,
                message: "",
                error: "Username and password is required"
            });
        }

        const existingUser = await User.findOne({ login: String(login) });

        if (existingUser) {
            return res.status(409).json({
                id: -1,
                message: "",
                error: "Login already taken"
            });
        }

        // the User model's pre-save hook hashes the password
        const newUser = await User.create({
            firstName: firstName,
            lastName: lastName,
            login: String(login),
            password: String(password),
            email: email
        });

        res.status(201).json({
            id: newUser._id,
            message: "User registered successfully",
            error: ""
        });
    }   catch (error) {
        console.log(error);
        res.status(400).json(
            {
                id: -1,
                message: "",
                error: "Error registering user"
            }
        )
    }
});

module.exports = router;
