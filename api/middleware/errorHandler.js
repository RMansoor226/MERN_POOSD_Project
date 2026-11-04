const AppError = require("../utils/AppError");

function notFound(req, res, next) {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err); // prevents changing ongoing responses

    let statusCode = 500;
    let message = 'Internal Server Error';
    let details;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }   else if (err.name === "ValidationError") {       // Mongoose schema validation
        statusCode = 400;
        message = "Validation Failed";
        details = Object.fromEntries(
            Object.entries(err.errors).map(([field, e]) => [field, e.message])
        );
    }   else if (err.code === 11000) {                      // duplicate key (unique index)
        statusCode = 409;
        const field = Object.keys(err.keyPattern || {})[0];
        message = field === 'login'
            ? 'User with this login already exists'
            : 'Unable to complete the request with the provided details';

    } else if (err.name === 'CastError') {                // bad ObjectId, wrong type
        statusCode = 400;
        message = `Invalid value for ${err.path}`;

    } else if (err.type === 'entity.parse.failed') {      // malformed JSON from express.json
        statusCode = 400;
        message = 'Malformed JSON body';

    } else if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Request body too large';
    }

    if (statusCode >= 500) console.error(err);                // log server faults only
    res.status(statusCode).json({
        error: message,
        ...(details && { details })
    });
}

module.exports = {
    errorHandler,
    notFound
}