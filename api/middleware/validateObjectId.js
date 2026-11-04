const AppError = require('../utils/AppError');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function validateObjectId(req, res, next, id) {
    if (!OBJECT_ID.test(id)) throw new AppError(400, 'Invalid id format');
    next();
}

module.exports = validateObjectId;