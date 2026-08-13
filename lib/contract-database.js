const fs = require('fs');
const path = require('path');

const contractMigrationPath = path.join(__dirname, '..', 'migrations', '001_create_contracts.sql');

async function ensureContractSchema(connection) {
  const sql = fs.readFileSync(contractMigrationPath, 'utf8');
  await connection.query(sql);
}

function contractDatabaseError(err) {
  if (err && err.code === 'ER_NO_SUCH_TABLE' && /(?:^|\.)contracts(?:'|\s|$)/i.test(err.sqlMessage || err.message || '')) {
    return {
      status: 503,
      error: 'Contracts database table is missing. Run migrations/001_create_contracts.sql and restart the server.'
    };
  }
  return null;
}

function sendContractDatabaseError(res, err) {
  const mapped = contractDatabaseError(err);
  if (mapped) return res.status(mapped.status).json({ error: mapped.error });
  console.error('[Contract database]', err);
  return res.status(500).json({ error: 'Unable to access contracts. Check the server log for details.' });
}

module.exports = { contractDatabaseError, ensureContractSchema, sendContractDatabaseError };
