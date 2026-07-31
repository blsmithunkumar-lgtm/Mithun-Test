const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * Shared connection pool. Using a pool (rather than a single connection)
 * lets concurrent requests each borrow a connection without blocking
 * on each other, and reconnects automatically after transient failures.
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as 'YYYY-MM-DD' strings, not JS Date objects, to avoid timezone drift
  // Cloud MySQL-compatible providers (TiDB Cloud, Aiven, Clever Cloud, etc.) require TLS.
  // DB_SSL is opt-in via env so local MySQL (no TLS) keeps working unchanged.
  ...(env.db.ssl
    ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: env.db.sslRejectUnauthorized } }
    : {}),
});

/**
 * Verifies the database is reachable. Called once at server startup so
 * a bad DB config fails loudly at boot instead of on the first request.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    // eslint-disable-next-line no-console
    console.log(`[DB] Connected to MySQL database "${env.db.name}" at ${env.db.host}:${env.db.port}`);
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection };
