-- Durable organization geocoding state for large PetConnect imports.
ALTER TABLE rescue_partners ADD COLUMN geocode_status ENUM('pending','located','failed','needs_review') NOT NULL DEFAULT 'pending';
ALTER TABLE rescue_partners ADD COLUMN geocode_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE rescue_partners ADD COLUMN geocoded_at TIMESTAMP NULL;
ALTER TABLE rescue_partners ADD COLUMN geocode_error VARCHAR(255) NULL;
ALTER TABLE rescue_partners ADD INDEX idx_partners_geocode_status (geocode_status, geocode_attempts);
