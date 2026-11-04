const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

function signToken(user) {
    return jwt.sign(
        {
            sub: String(user._id),
            role: user.role
        },
        config.JWT_SECRET,
        {
            expiresIn: config.JWT_EXPIRES_IN,
            algorithm: 'HS256'
        }
    );
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [schema, token] = header.split(' ');
    if (schema !== 'Bearer' || !token) {
        throw new AppError(401, "Authentication required");
    }

    try {
        const payload = jwt.verify(token, config.JWT_SECRET);
        req.userId = payload.sub;
        req.userRole = payload.role;
        next();
    }   catch {
        throw new AppError(401, "Invalid or expired token");
    }
}

const requireSelfOrRole = (...roles) => (req, res, next) => {
    if (req.userId === req.params.id || roles.includes(req.userRole)) return next();
    throw new AppError(403, 'You do not have access to this resource');
};

module.exports = { signToken, requireAuth, requireSelfOrRole };