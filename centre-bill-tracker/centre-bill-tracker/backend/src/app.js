const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const ApiError = require('./utils/ApiError');

const app = express();

// Render (and most PaaS providers) sit behind a reverse proxy; trusting it
// gives Express the real client protocol/IP instead of the proxy's.
app.set('trust proxy', 1);

// Allow one or more configured frontend origins (e.g. a Vercel production
// domain and a local dev server). No cookies are used for auth (JWT is sent
// via the Authorization header), so credentials are not required.
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (e.g. server-to-server health checks, curl).
      if (!origin || env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin "${origin}" is not allowed by CORS.`));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Centre Bill Tracker API is running' });
});

app.use('/api', routes);

// Unknown route handler
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Centralized error handler - must be last
app.use(errorMiddleware);

module.exports = app;
