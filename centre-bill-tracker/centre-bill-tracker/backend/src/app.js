const path = require('path');
const fs = require('fs');
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
      // IMPORTANT: pass `false`, not an Error. Throwing here causes the cors
      // middleware to surface it as an uncaught 500, which masks a routine
      // "origin not allowed" rejection as a server crash. Passing `false`
      // makes cors correctly omit the Access-Control-Allow-Origin header
      // (so the browser blocks the request, as intended) without a 500.
      // eslint-disable-next-line no-console
      console.warn(`[CORS] Rejected origin: "${origin}". Allowed: ${env.clientOrigins.join(', ')}`);
      return callback(null, false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Centre Bill Tracker API is running' });
});

app.use('/api', routes);

// -----------------------------------------------------------------------
// Optional single-process hosting: when SERVE_FRONTEND=true, this Express
// server also serves the built frontend (frontend/dist) and falls back to
// index.html for client-side routes. This lets the whole app run behind
// one URL/port, which is what Replit's testing environment needs.
// It is OFF by default and has no effect on the normal Render (API-only)
// + Vercel (static frontend) split deployment described in DEPLOYMENT.md.
// -----------------------------------------------------------------------
if (String(process.env.SERVE_FRONTEND).toLowerCase() === 'true') {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/^(?!\/api|\/health).*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[SERVER] SERVE_FRONTEND=true but no build found at ${distPath}. Run "npm run build" in frontend/ first.`);
  }
}

// Unknown route handler (API-only requests that don't match anything above)
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Centralized error handler - must be last
app.use(errorMiddleware);

module.exports = app;
