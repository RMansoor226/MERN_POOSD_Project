const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// POST /api/users
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                message: "Username and password is required"
            });
        }

        const foundUser = await User.findOne({ login: String(login) }).select("+password");

        if (!foundUser || !(await foundUser.checkPassword(String(password)))) {
            console.log(String(password));
            return res.status(401).json({
                message: "Invalid login or password"
            });
        }

        res.status(200).json({
            message: "Login successful"
        });
    }   catch (error) {
        console.log(error);
        res.status(500).json(
            {
                message: "Error logging in"
            }
        )
    }
});

module.exports = router;