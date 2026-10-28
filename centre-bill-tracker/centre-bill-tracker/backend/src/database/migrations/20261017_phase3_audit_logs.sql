-- Phase 3: append-only audit trail for finance and bill changes.
CREATE TABLE IF NOT EXISTS bill_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NULL,
  actor_user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(80) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bill_audit_logs_bill_created (bill_id, created_at),
  KEY idx_bill_audit_logs_actor_created (actor_user_id, created_at),
  CONSTRAINT fk_bill_audit_logs_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL,
  CONSTRAINT fk_bill_audit_logs_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
