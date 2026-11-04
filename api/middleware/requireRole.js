const AppError = require('../utils/AppError');

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.userRole)) throw new AppError(403, 'Insufficient permissions');
    next();
};

module.exports = requireRole;