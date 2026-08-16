-- PetConnect member accounts and registered pets.
CREATE TABLE IF NOT EXISTS members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  phone VARCHAR(64) NULL,
  city VARCHAR(128) NULL,
  state VARCHAR(64) NULL,
  country ENUM('US','CA') NOT NULL DEFAULT 'US',
  postal_code VARCHAR(32) NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token VARCHAR(64) NULL,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  email_alert_radius INT UNSIGNED NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_members_country (country),
  INDEX idx_members_verify_token (verify_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registered_pets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  microchip_number VARCHAR(32) NULL UNIQUE,
  pet_name VARCHAR(64) NOT NULL,
  species ENUM('Dog','Cat','Bird','Other') NOT NULL DEFAULT 'Dog',
  breed VARCHAR(128) NULL,
  color VARCHAR(128) NULL,
  gender ENUM('Male','Female','Unknown') NOT NULL DEFAULT 'Unknown',
  birth_date DATE NULL,
  photo_filename VARCHAR(255) NULL,
  notes TEXT NULL,
  is_missing BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_registered_pets_member (member_id),
  INDEX idx_registered_pets_missing (is_missing),
  CONSTRAINT fk_registered_pets_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
