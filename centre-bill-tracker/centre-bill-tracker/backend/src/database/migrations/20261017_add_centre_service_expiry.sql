-- Centre Master compatibility migration.
-- Select the target database before running this file.
-- Safe to re-run: each column is added only when it is missing.

SET @centre_bill_tracker_db = DATABASE();

SET @has_service_type = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @centre_bill_tracker_db
    AND TABLE_NAME = 'centres'
    AND COLUMN_NAME = 'service_type'
);
SET @sql_service_type = IF(
  @has_service_type = 0,
  "ALTER TABLE centres ADD COLUMN service_type ENUM('Firewall', 'Leased Line', 'Broadband', 'Managed Service') NULL AFTER account_number",
  'SELECT 1'
);
PREPARE stmt_service_type FROM @sql_service_type;
EXECUTE stmt_service_type;
DEALLOCATE PREPARE stmt_service_type;

SET @has_contract_expiry_date = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @centre_bill_tracker_db
    AND TABLE_NAME = 'centres'
    AND COLUMN_NAME = 'contract_expiry_date'
);
SET @sql_contract_expiry_date = IF(
  @has_contract_expiry_date = 0,
  "ALTER TABLE centres ADD COLUMN contract_expiry_date DATE NULL AFTER status",
  'SELECT 1'
);
PREPARE stmt_contract_expiry_date FROM @sql_contract_expiry_date;
EXECUTE stmt_contract_expiry_date;
DEALLOCATE PREPARE stmt_contract_expiry_date;
