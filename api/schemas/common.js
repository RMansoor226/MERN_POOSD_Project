const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
const optionalEmail = z.string().trim().email('Invalid email address').or(z.literal('')).optional();
const nameField = z.string().trim().max(50).optional();

module.exports = { objectId, optionalEmail, nameField };