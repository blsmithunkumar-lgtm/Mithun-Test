/**
 * Audit writes remain best-effort by default for non-financial activity.
 * Critical financial writes can pass their active transaction executor and
 * set throwOnError so audit failure aborts the surrounding transaction.
 *
 * Resolve the default pool lazily so isolated unit tests can inject an
 * executor without requiring production database environment variables.
 */
async function writeAuditLog({
  executor = null, throwOnError = false, billId = null, actorUserId = null,
  action, entityType, entityId = null, details = null,
}) {
  try {
    const db = executor || require('../config/db').pool;
    await db.execute(
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
