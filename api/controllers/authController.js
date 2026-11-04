const { User } = require('../../models');
const AppError = require('../utils/AppError');
const cleanValue = require('../utils/cleanValue');
const { signToken } = require('../middleware/auth');

// POST /api/auth/login
// incoming: login, password (already validated by loginSchema)
// outgoing: id, firstName, lastName, role, token, error
exports.login = async (req, res) => {
    const { login, password } = req.body;

    // password is excluded from queries by default, so ask for it explicitly
    const foundUser = await User.findOne({ login }).select('+password');

    if (!foundUser || !(await foundUser.checkPassword(password))) {
        throw new AppError(401, 'Login/Password incorrect');
    }

    return res.status(200).json({
        id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        token: signToken(foundUser),
        error: ''
    });
};

// POST /api/auth/register
// incoming: firstName, lastName, login, password, email (already validated by registerSchema)
// outgoing: id, message, error
exports.register = async (req, res) => {
    const { firstName, lastName, login, password, email } = req.body;

    // the User model's pre-save hook hashes the password
    // cleanValue turns '' into undefined so the sparse unique email index ignores it
    const newUser = await User.create({
        firstName: cleanValue(firstName),
        lastName: cleanValue(lastName),
        login,
        password,
        email: cleanValue(email)
    });

    return res.status(201).json({
        id: newUser._id,
        message: 'User registered successfully',
        error: ''
    });
};
