const { z } = require('zod');
const { optionalEmail, nameField } = require('./common');

const registerSchema = z.object({
    firstName: nameField,
    lastName: nameField,
    login: z.string().trim().min(3, 'Login must be at least 3 characters').max(30),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72), // bcrypt ignores bytes past 72
    email: optionalEmail
});

const loginSchema = z.object({
    login: z.string().min(1, 'Login is required'),
    password: z.string().min(1, 'Password is required')
});

module.exports = { registerSchema, loginSchema };