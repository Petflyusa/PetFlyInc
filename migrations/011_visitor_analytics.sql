CREATE TABLE IF NOT EXISTS visitor_visits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visitor_key CHAR(64) NOT NULL,
  path VARCHAR(255) NOT NULL,
  referrer VARCHAR(512) NULL,
  country VARCHAR(128) NULL,
  city VARCHAR(128) NULL,
  user_agent VARCHAR(512) NULL,
  account_type VARCHAR(32) NULL,
  account_id VARCHAR(128) NULL,
  PRIMARY KEY (id),
  INDEX idx_visitor_visits_time (visited_at),
  INDEX idx_visitor_visits_path (path),
  INDEX idx_visitor_visits_country (country),
  INDEX idx_visitor_visits_visitor (visitor_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
