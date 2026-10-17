-- =====================================================================
-- Centre Bill Tracker Portal (V1) - Database Schema
-- =====================================================================
-- Run this once against an empty database, e.g.:
--   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS centre_bill_tracker"
--   mysql -u root -p centre_bill_tracker < schema.sql
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table: users
-- Purpose: Login and authentication
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('Admin', 'Operations') NOT NULL,
  status        ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: centres
-- Purpose: Centre basic details
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS centres (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  centre_name     VARCHAR(200) NOT NULL,
  vendor_name     VARCHAR(200) NULL,
  wifi_id         VARCHAR(150) NULL,
  account_number       VARCHAR(150) NULL,
  service_type         ENUM('Firewall', 'Leased Line', 'Broadband', 'Managed Service') NULL,
  status               ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  contract_expiry_date DATE NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_centres_account_number UNIQUE (account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Note: account_number is nullable + unique. MySQL permits multiple NULLs
-- under a UNIQUE index, so centres without an account number (SRD allows
-- WiFi ID to be blank; account_number left optional the same way) do not
-- collide with each other, while any two non-null values must still differ.

-- ---------------------------------------------------------------------
-- Table: bills
-- Purpose: Bill tracking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  centre_id       INT NOT NULL,
  bill_month      VARCHAR(20) NOT NULL,
  invoice_number  VARCHAR(100) NOT NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  amount          DECIMAL(10, 2) NOT NULL,
  bill_status     ENUM('Pending', 'Received', 'Paid') NOT NULL DEFAULT 'Pending',
  payment_date    DATE NULL,
  remarks         TEXT NULL,
  created_by      INT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bills_centre FOREIGN KEY (centre_id) REFERENCES centres(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bills_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_bills_invoice_number UNIQUE (invoice_number),
  CONSTRAINT uq_bills_centre_month UNIQUE (centre_id, bill_month),
  CONSTRAINT chk_bills_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bills_due_date ON bills (due_date);
CREATE INDEX idx_bills_status ON bills (bill_status);
CREATE INDEX idx_centres_name ON centres (centre_name);

SET FOREIGN_KEY_CHECKS = 1;
