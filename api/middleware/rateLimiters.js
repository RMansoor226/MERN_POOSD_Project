const rateLimit = require('express-rate-limit');
const AppError = require("../utils/AppError");

const handler = (req, res, next) => next(new AppError(429, 'Too many requests, try again later'));

exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 300,
    standardHeaders: true, legacyHeaders: false, handler
});

exports.authLimiter = rateLimit({            // login and register only
    windowMs: 15 * 60 * 1000, limit: 10,
    standardHeaders: true, legacyHeaders: false, handler
});