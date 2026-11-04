const express = require('express');
const { User } = require('../../models');
const AppError = require("../utils/AppError");

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
    const users = await User.find();
    return res.status(200).json(users);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError(404, "User not found with that ID");
    }

    return res.status(200).json(user);
});

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'declarations'];

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    const foundUser = await User.findById(req.params.id);

    if (!foundUser) {
        throw new AppError(404, "User not found with that ID");
    }

    const body = req.body ?? {};
    for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) {
            foundUser[field] = field === "email" ? cleanValue(body[field]) : body[field];
        }
    }

    const updatedUser = await foundUser.save();

    return res.status(200).json(updatedUser);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
        throw new AppError(404, "User not found with that ID");
    }

    return res.status(200).json(deletedUser);
});

module.exports = router;