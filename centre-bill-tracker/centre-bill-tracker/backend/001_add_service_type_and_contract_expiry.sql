-- Migration 001: Add service_type and contract_expiry_date to centres
-- Module: Centre Master (Step 1 of Enterprise upgrade)
--
-- Safety note: MySQL/TiDB DDL statements (ALTER TABLE) auto-commit and
-- cannot be rolled back inside a transaction the way row-data changes can
-- (this differs from Postgres). The safe-execution approach here instead
-- is idempotency: `IF NOT EXISTS` (a TiDB extension beyond standard MySQL
-- syntax) means this script can be re-run safely without erroring or
-- duplicating columns if it partially applied before, or if a step is
-- deployed more than once.

USE centre_bill_tracker;

ALTER TABLE centres
  ADD COLUMN IF NOT EXISTS service_type ENUM('Firewall', 'Leased Line', 'Managed Service', 'Broadband') NULL AFTER wifi_id,
  ADD COLUMN IF NOT EXISTS contract_expiry_date DATE NULL AFTER status;
