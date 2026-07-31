/**
 * Seed script - creates exactly one Admin and one Operations user.
 * Run with: npm run seed
 *
 * V1 has no User Management module (per approved scope), so this script
 * is the only way to provision login accounts. Safe to re-run: it skips
 * any username that already exists instead of erroring or duplicating.
 */
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const env = require('../config/env');

const SALT_ROUNDS = 10;

async function upsertUser({ username, password, fullName, role }) {
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[SEED] User "${username}" already exists - skipping.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  await pool.query(
    `INSERT INTO users (username, password, full_name, role, status)
     VALUES (?, ?, ?, ?, 'Active')`,
    [username, hashedPassword, fullName, role],
  );
  // eslint-disable-next-line no-console
  console.log(`[SEED] Created ${role} user "${username}".`);
}

async function run() {
  try {
    await upsertUser({
      username: env.seed.adminUsername,
      password: env.seed.adminPassword,
      fullName: 'Administrator',
      role: 'Admin',
    });

    await upsertUser({
      username: env.seed.opsUsername,
      password: env.seed.opsPassword,
      fullName: 'Operations User',
      role: 'Operations',
    });

    // eslint-disable-next-line no-console
    console.log('[SEED] Done.');
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[SEED] Failed:', err.message);
    process.exit(1);
  }
}

run();
