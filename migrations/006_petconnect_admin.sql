-- Add complete member addresses and organization invitation tracking.
ALTER TABLE members ADD COLUMN address_line VARCHAR(255) NULL;
ALTER TABLE rescue_partners ADD COLUMN invitation_sent_at TIMESTAMP NULL;
ALTER TABLE rescue_partners ADD COLUMN invitation_expires_at TIMESTAMP NULL;
ALTER TABLE rescue_partners ADD INDEX idx_partners_invitation (invitation_sent_at, invitation_expires_at);
