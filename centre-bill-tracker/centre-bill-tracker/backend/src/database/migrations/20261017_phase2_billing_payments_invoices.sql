-- Phase 2: bill breakdown, invoice attachments, and payment ledger.
-- Additive and safe to re-run on an existing Centre Bill Tracker database.
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
