require('dotenv').config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');   // fail at startup, not on first login
}

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    RATE_WINDOW_MS: Number(process.env.RATE_WINDOW_MS) || 15 * 60 * 1000,
    API_RATE_LIMIT: Number(process.env.API_RATE_LIMIT) || 300,
    AUTH_RATE_LIMIT: Number(process.env.AUTH_RATE_LIMIT) || 10
};