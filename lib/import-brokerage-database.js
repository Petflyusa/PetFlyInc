async function ensureImportBrokerageSchema(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS import_brokerage_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(64) NULL,
    import_country VARCHAR(120) NOT NULL,
    import_city_port VARCHAR(160) NULL,
    origin_country VARCHAR(120) NULL,
    estimated_arrival_date DATE NULL,
    pet_type VARCHAR(64) NULL,
    pet_name VARCHAR(160) NULL,
    breed VARCHAR(160) NULL,
    pet_count INT NULL,
    microchip VARCHAR(64) NULL,
    document_status VARCHAR(120) NULL,
    flight_details VARCHAR(255) NULL,
    requested_services TEXT NULL,
    notes TEXT NULL,
    status ENUM('pending','in_review','quoted','completed','cancelled') NOT NULL DEFAULT 'pending',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_import_brokerage_created (created_at),
    INDEX idx_import_brokerage_status (status)
  )`);
  const [rows] = await connection.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', ['import_brokerage_requests']);
  const existing = new Set(rows.map(row => row.COLUMN_NAME));
  for (const [column, definition] of Object.entries({ airway_bill_number: 'VARCHAR(80) NULL', airline: 'VARCHAR(160) NULL' })) {
    if (!existing.has(column)) await connection.query(`ALTER TABLE import_brokerage_requests ADD COLUMN ${column} ${definition}`);
  }
}

module.exports = { ensureImportBrokerageSchema };
