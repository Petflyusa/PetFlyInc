const quoteColumns = {
  pet_color: 'VARCHAR(64) NULL',
  pet_gender: 'VARCHAR(16) NULL',
  pet_dob: 'DATE NULL',
  microchip: 'VARCHAR(32) NULL',
  pickup_delivery: 'BOOLEAN NULL DEFAULT FALSE',
  pickup_address: 'TEXT NULL',
  delivery_address: 'TEXT NULL'
};

async function ensureQuoteSchema(connection) {
  const [rows] = await connection.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['quote_requests']
  );
  const existingColumns = new Set(rows.map(row => row.COLUMN_NAME));

  for (const [column, definition] of Object.entries(quoteColumns)) {
    if (!existingColumns.has(column)) {
      await connection.query(`ALTER TABLE quote_requests ADD COLUMN ${column} ${definition}`);
    }
  }
}

module.exports = { ensureQuoteSchema, quoteColumns };
