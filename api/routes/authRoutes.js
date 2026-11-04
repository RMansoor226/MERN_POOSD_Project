const express = require('express');
const { authLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/authSchemas');
const auth = require('../controllers/authController');

const router = express.Router();

// limiter runs first so malformed attempts still count toward the limit
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/register', authLimiter, validate(registerSchema), auth.register);

module.exports = router;
