const AppError = require('../utils/AppError');

// Express 5 makes req.query a read-only getter, so parsed values go on req.parsedQuery
const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
        const details = {};
        for (const issue of result.error.issues) details[issue.path.join('.') || '_'] = issue.message;
        throw new AppError(400, 'Validation Failed', details);
    }
    req.parsedQuery = result.data;
    next();
};

module.exports = validateQuery;