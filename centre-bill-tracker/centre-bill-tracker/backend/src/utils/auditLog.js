const { pool } = require('../config/db');

/**
 * Audit writes remain best-effort by default for non-financial activity.
 * Critical financial writes can pass their active transaction executor and
 * set throwOnError so audit failure aborts the surrounding transaction.
 */
async function writeAuditLog({
  executor = pool, throwOnError = false, billId = null, actorUserId = null,
  action, entityType, entityId = null, details = null,
}) {
  try {
    await executor.execute(
      `INSERT INTO bill_audit_logs
       (bill_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [billId, actorUserId, action, entityType, entityId === null ? null : String(entityId),
        details === null ? null : JSON.stringify(details)],
    );
  } catch (error) {
    if (throwOnError) throw error;
    // eslint-disable-next-line no-console
    console.error('[AUDIT] Failed to persist audit event', { action, entityType, billId, message: error.message });
  }
}

module.exports = { writeAuditLog };
