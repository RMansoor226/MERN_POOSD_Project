const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await User.find();

        res.status(200).json(users);
    }   catch (error) {
        res.status(500).json(
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
            res.status(404).send("User not found with that ID");
            return;
        }

        res.status(200).json(user);
    }   catch (error) {
        res.status(400).json(
            {
                message: "Error fetching user"
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
            { new: true, runValidators: true }
        );

        if (!modifiedUser) {
            res.status(404).send("No User found with that ID");
            return;
        }

        res.status(200).json(modifiedUser);
    }   catch (error) {
        res.status(400).json(
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
            res.status(404).send("No User found with that ID");
            return;
        }

        res.status(200).json(deletedUser);
    }   catch (error) {
        res.status(400).json(
            {
                message: "Error deleting user"
            }
        )
    }
});

module.exports = router;