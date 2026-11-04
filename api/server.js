const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

require('dotenv').config();

// --- Database -------------------------------------------------------------
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/AppDB';
mongoose
  .connect(url)
  .then(() => console.log('MongoDB connected successfully via Mongoose'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- App ------------------------------------------------------------------
const app = express();

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// Link middleware
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiLimiter);

// Link Routers
const usersRouter = require('./routes/userRoutes');
app.use('/api/users', usersRouter);

const authRouter = require('./routes/authRoutes');
app.use('/api/auth', authRouter);

// GET /api/ping - Health check
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'Hello World from MERN-Project' });
});

app.use(notFound);
app.use(errorHandler);

// Start listening only when run directly (node server.js), not when a test
// file loads the app with require()
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
