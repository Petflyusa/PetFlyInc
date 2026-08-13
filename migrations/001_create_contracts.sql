-- Adds the client-contract workflow to an existing Pet Fly database.
-- Safe to run more than once; it does not alter existing tables or records.
CREATE TABLE IF NOT EXISTS contracts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_number VARCHAR(32) NOT NULL UNIQUE,
  quote_request_id INT UNSIGNED NULL,
  status ENUM('draft','issued','signed') NOT NULL DEFAULT 'draft',
  contract_data JSON NOT NULL,
  client_signature MEDIUMTEXT NULL,
  client_signed_name VARCHAR(255) NULL,
  signed_at TIMESTAMP NULL,
  issued_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contract_status (status),
  INDEX idx_quote_request (quote_request_id),
  CONSTRAINT fk_contract_quote
    FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
