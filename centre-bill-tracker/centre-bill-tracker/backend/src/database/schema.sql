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


-- ---------------------------------------------------------------------
-- Phase 2: bill bifurcation, payment ledger, and invoice attachments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  category ENUM('Base Amount','Internet','Static IP','Late Fee','GST') NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bill_items_bill_category (bill_id, category),
  CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT chk_bill_items_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bill_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL,
  tds_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('Bank Transfer','NEFT','RTGS','IMPS','UPI','Cheque','Other') NOT NULL DEFAULT 'Bank Transfer',
  transaction_reference VARCHAR(120) NULL,
  reconciliation_status ENUM('Pending','Matched','Mismatch') NOT NULL DEFAULT 'Pending',
  remarks VARCHAR(1000) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bill_payments_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_payments_user FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT chk_bill_payments_amount CHECK (amount_paid > 0),
  CONSTRAINT chk_bill_payments_tds CHECK (tds_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bill_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type ENUM('application/pdf','image/jpeg','image/png','image/webp') NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_data LONGBLOB NOT NULL,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bill_attachments_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS bill_amortizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  amortization_month CHAR(7) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bill_amortization_bill_month (bill_id, amortization_month),
  CONSTRAINT fk_bill_amortizations_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_amortizations_user FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT chk_bill_amortizations_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bill_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  approval_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  requested_by INT NOT NULL,
  reviewed_by INT NULL,
  request_note VARCHAR(1000) NULL,
  review_note VARCHAR(1000) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  UNIQUE KEY uq_bill_approvals_bill (bill_id),
  CONSTRAINT fk_bill_approvals_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_approvals_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_bill_approvals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
