const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});   // Express 5: req.body is undefined if no body was sent
    if (!result.success) {
        const details = {};
        for (const issue of result.error.issues) details[issue.path.join('.') || '_'] = issue.message;
        throw new AppError(400, 'Validation failed', details);
    }
    req.body = result.data;     // only declared, coerced fields continue
    next();
};

module.exports = validate;