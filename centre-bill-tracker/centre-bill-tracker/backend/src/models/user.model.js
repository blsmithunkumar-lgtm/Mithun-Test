const { pool } = require('../config/db');

/**
 * Finds an active or inactive user by username (used at login).
 * Returns the full row including the hashed password so the auth
 * controller can compare it - the controller is responsible for
 * stripping it before sending a response back to the client.
 */
async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, username, password, full_name, role, status FROM users WHERE username = ? LIMIT 1',
    [username],
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, full_name, role, status FROM users WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

module.exports = { findByUsername, findById };
