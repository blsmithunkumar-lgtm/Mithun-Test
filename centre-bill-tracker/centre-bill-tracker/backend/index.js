// Vercel serverless entrypoint.
// Vercel's Node runtime treats any exported (req, res) => {} function as a
// request handler — an Express app instance satisfies that signature, so
// we can reuse the exact same app (routes, CORS, error handling) that
// server.js uses for Render. This file is ONLY used by Vercel; server.js
// (with app.listen) is still what Render/Replit run.
const app = require('../src/app');

module.exports = app;
