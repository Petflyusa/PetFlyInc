-- Add location and expiring verification support without changing existing records.
ALTER TABLE members ADD COLUMN latitude DECIMAL(10,8) NULL;
ALTER TABLE members ADD COLUMN longitude DECIMAL(11,8) NULL;
ALTER TABLE members ADD COLUMN verify_token_expires_at TIMESTAMP NULL;
ALTER TABLE members ADD INDEX idx_members_location (latitude, longitude);
