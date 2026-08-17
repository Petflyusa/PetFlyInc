-- Retry rate-limited geocoding without operator intervention.
ALTER TABLE rescue_partners ADD COLUMN next_geocode_retry_at DATETIME NULL;
ALTER TABLE rescue_partners ADD INDEX idx_partners_geocode_retry (geocode_status, next_geocode_retry_at);

-- Restore records that reached the former three-attempt limit because the provider rate-limited requests.
UPDATE rescue_partners
SET geocode_status='pending', next_geocode_retry_at=DATE_ADD(NOW(), INTERVAL 1 HOUR)
WHERE geocode_status='failed' AND geocode_error LIKE '%HTTP 429%';
