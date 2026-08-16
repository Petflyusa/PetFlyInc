-- PetConnect rescue partner and missing-pet alert network.
CREATE TABLE IF NOT EXISTS partner_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(32) NOT NULL UNIQUE,
  label VARCHAR(64) NOT NULL,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO partner_types (slug, label) VALUES
  ('vet', 'Veterinary Hospital'),
  ('shelter', 'Animal Shelter'),
  ('groomer', 'Pet Grooming Salon'),
  ('pet-travel', 'Pet Travel Company')
ON DUPLICATE KEY UPDATE label=VALUES(label);

CREATE TABLE IF NOT EXISTS rescue_partners (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_type_id INT UNSIGNED NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(64) NULL,
  address_line VARCHAR(255) NULL,
  city VARCHAR(128) NOT NULL,
  state VARCHAR(64) NULL,
  postal_code VARCHAR(32) NULL,
  country ENUM('US','CA') NOT NULL DEFAULT 'US',
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  website VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token VARCHAR(64) NULL,
  password_hash VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_partners_type (partner_type_id),
  INDEX idx_partners_country_active (country, is_active),
  INDEX idx_partners_location (latitude, longitude),
  CONSTRAINT fk_rescue_partner_type FOREIGN KEY (partner_type_id) REFERENCES partner_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS missing_alerts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id INT UNSIGNED NOT NULL,
  member_id INT UNSIGNED NOT NULL,
  alert_type ENUM('lost','found') NOT NULL DEFAULT 'lost',
  last_seen_location TEXT NULL,
  last_seen_city VARCHAR(128) NULL,
  last_seen_state VARCHAR(64) NULL,
  last_seen_country ENUM('US','CA') NOT NULL DEFAULT 'US',
  last_seen_latitude DECIMAL(10,8) NULL,
  last_seen_longitude DECIMAL(11,8) NULL,
  last_seen_date DATE NULL,
  search_radius INT UNSIGNED NOT NULL DEFAULT 100,
  radius_unit ENUM('mi','km') NOT NULL DEFAULT 'mi',
  contact_info TEXT NULL,
  reward TEXT NULL,
  description TEXT NULL,
  photo_filename VARCHAR(255) NULL,
  status ENUM('active','found','closed') NOT NULL DEFAULT 'active',
  email_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_alert_status_date (status, created_at),
  INDEX idx_alert_location (last_seen_latitude, last_seen_longitude),
  CONSTRAINT fk_alert_pet FOREIGN KEY (pet_id) REFERENCES registered_pets(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alert_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alert_id INT UNSIGNED NOT NULL,
  recipient_member_id INT UNSIGNED NULL,
  recipient_partner_id INT UNSIGNED NULL,
  notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alert_notifications_member (recipient_member_id, notified_at),
  INDEX idx_alert_notifications_partner (recipient_partner_id, notified_at),
  INDEX idx_alert_notifications_alert (alert_id),
  CONSTRAINT fk_alert_notification_alert FOREIGN KEY (alert_id) REFERENCES missing_alerts(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_notification_member FOREIGN KEY (recipient_member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_notification_partner FOREIGN KEY (recipient_partner_id) REFERENCES rescue_partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
