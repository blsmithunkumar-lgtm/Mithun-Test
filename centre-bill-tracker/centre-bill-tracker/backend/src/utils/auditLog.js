const { pool } = require('../config/db');

/**
 * Best-effort audit writer. Business writes should not be rolled back merely
 * because audit storage is temporarily unavailable; failures are surfaced to
 * server logs so operators can alert on them.
 */
async function writeAuditLog({ billId = null, actorUserId = null, action, entityType, entityId = null, details = null }) {
  try {
    await pool.execute(
      `INSERT INTO bill_audit_logs
       (bill_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [billId, actorUserId, action, entityType, entityId === null ? null : String(entityId),
        details === null ? null : JSON.stringify(details)],
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[AUDIT] Failed to persist audit event', { action, entityType, billId, message: error.message });
  }
}

module.exports = { writeAuditLog };
