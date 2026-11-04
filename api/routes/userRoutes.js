const express = require('express');
const { User } = require('../../models');
const AppError = require('../utils/AppError');
const cleanValue = require('../utils/cleanValue');
const { requireAuth, requireSelfOrRole } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const { updateUserSchema } = require('../schemas/userSchemas');

const router = express.Router();

router.use(requireAuth);
router.param('id', validateObjectId);

// GET /api/users (restricted to admin access)
router.get('/', requireRole('admin'), async (req, res) => {
    const users = await User.find();
    return res.status(200).json(users);
});

// GET /api/users/:id
router.get('/:id', requireSelfOrRole('admin'), async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError(404, "User not found with that ID");
    }

    return res.status(200).json(user);
});

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'declarations'];

// PATCH /api/users/:id
router.patch('/:id', requireSelfOrRole('admin'), validate(updateUserSchema), async (req, res) => {
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
router.delete('/:id', requireRole('admin'), async (req, res) => {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
        throw new AppError(404, "User not found with that ID");
    }

    return res.status(200).json(deletedUser);
});

module.exports = router;