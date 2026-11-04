const { User } = require('../../models');
const AppError = require('../utils/AppError');
const cleanValue = require('../utils/cleanValue');

// second layer behind the zod schema's key stripping
const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'declarations'];

// GET /api/users (admin only)
exports.listUsers = async (req, res) => {
    const users = await User.find();
    return res.status(200).json(users);
};

// GET /api/users/:id (self or admin)
exports.getUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'User not found with that ID');
    return res.status(200).json(user);
};

// PATCH /api/users/:id (self or admin)
// declarations replaces the entire array
exports.updateUser = async (req, res) => {
    const foundUser = await User.findById(req.params.id);
    if (!foundUser) throw new AppError(404, 'User not found with that ID');

    const body = req.body ?? {};
    for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) {
            foundUser[field] = field === 'email' ? cleanValue(body[field]) : body[field];
        }
    }

    // save() (not findByIdAndUpdate) so validators and the pre-save hooks run
    const updatedUser = await foundUser.save();
    return res.status(200).json(updatedUser);
};

// DELETE /api/users/:id (admin only)
exports.deleteUser = async (req, res) => {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) throw new AppError(404, 'User not found with that ID');
    return res.status(200).json(deletedUser);
};
