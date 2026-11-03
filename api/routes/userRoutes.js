const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await User.find();

        return res.status(200).json(users);
    }   catch (error) {
        return res.status(500).json(
            {
                message: "Error fetching users"
            }
        )
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).send("User not found with that ID");
            return;
        }

        return res.status(200).json(user);
    }   catch (error) {
        return res.status(400).json(
            {
                message: "Error fetching user"
            }
        )
    }
});

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'declarations'];

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    try {
        const foundUser = await User.findById(req.params.id);

        if (!foundUser) {
            return res.status(404).json(
                {
                    message: "No User found with that ID"
                }
            )
        }

        for (const field of ALLOWED_FIELDS) {
            if (req.body[field] !== undefined) {
                foundUser[field] = req.body[field];
            }
        }

        const updatedUser = await foundUser.save();

        return res.status(200).json(updatedUser);
    }   catch (error) {
        return res.status(400).json(
            {
                message: "Error modifying user"
            }
        )
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res.status(404).send("No User found with that ID");
        }

        return res.status(200).json(deletedUser);
    }   catch (error) {
        return res.status(400).json(
            {
                message: "Error deleting user"
            }
        )
    }
});

module.exports = router;