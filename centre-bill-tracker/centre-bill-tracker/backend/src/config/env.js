require('dotenv').config();

/**
 * Centralized, validated access to environment variables.
 * Fails fast at boot if a required variable is missing, instead of
 * surfacing confusing errors later at request time.
 */
const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy backend/.env.example to backend/.env and fill in the values.');
    process.exit(1);
  }
}

validateEnv();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME,
    // Managed MySQL-compatible cloud providers (TiDB Cloud, Aiven, Clever Cloud, etc.)
    // require TLS. Set DB_SSL=true for those; leave unset/false for a local MySQL
    // instance that has no TLS configured.
    ssl: String(process.env.DB_SSL).toLowerCase() === 'true',
    sslRejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== 'false',
    // mysql2 defaults to 10000ms, which can be too tight for a cross-region
    // serverless connection (Vercel function <-> TiDB cluster in different
    // regions) on a cold start. Default raised to 20s here; override with
    // DB_CONNECT_TIMEOUT_MS if needed.
    connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 20000,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  // Comma-separated list of allowed frontend origins, e.g.
  // "https://your-app.vercel.app,http://localhost:5173" - supports having both
  // a deployed production frontend and a local dev frontend allowed at once.
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    opsUsername: process.env.SEED_OPERATIONS_USERNAME || 'operations',
    opsPassword: process.env.SEED_OPERATIONS_PASSWORD || 'Operations@123',
  },
};
