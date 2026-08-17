CREATE TABLE IF NOT EXISTS uploaded_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  storage_key CHAR(36) NOT NULL UNIQUE,
  category VARCHAR(32) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  file_data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uploaded_files_category_created (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
