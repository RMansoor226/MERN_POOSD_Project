const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await User.find();

        if (!users) {
            res.status(404).send("No users found");
        }

        res.status(200).json(users);
    }   catch (error) {
        res.status(500).json(
            {
                message: "Error fetching users",
                error: error.message
            }
        )
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404).send("User not found with that ID");
        }

        res.status(200).json(user);
    }   catch (error) {
        res.status(500).json(
            {
                message: "Error fetching user",
                error: error.message
            }
        )
    }
});

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();

        res.status(201).json(savedUser);
    }   catch (error) {
        res.status(400).json(
            {
                message: "Error creating user",
                error: error.message
            }
        )
    }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    try {
        const modifiedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidator: true }
        );

        if (!modifiedUser) {
            res.status(404).send("No User found with that ID");
        }

        res.status(200).json(modifiedUser);
    }   catch (error) {
        res.status(400).json(
            {
                message: "Error modifying user",
                error: error.message
            }
        )
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            res.status(404).send("No User found with that ID");
        }

        res.status(200).json(deletedUser);
    }   catch (error) {
        res.status(400).json(
            {
                message: "Error deleting user",
                error: error.message
            }
        )
    }
});

module.exports = router;