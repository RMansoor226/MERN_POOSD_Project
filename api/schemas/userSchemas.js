const { z } = require('zod');
const { objectId, optionalEmail, nameField } = require('./common');

const declarationSchema = z.object({
    programId: objectId,
    catalogYear: z.number().int().min(1900).max(2100),
    declaredAt: z.coerce.date().optional()
});

// Unknown keys (like "role") are stripped by default
const updateUserSchema = z.object({
    firstName: nameField,
    lastName: nameField,
    email: optionalEmail,
    declarations: z.array(declarationSchema).max(10).optional()
}).refine((v) => Object.keys(v).length > 0, 'Provide at least one updatable field');

module.exports = { updateUserSchema };