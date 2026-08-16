const fs = require('fs');
const path = require('path');

async function ensurePetConnectSchema(connection) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '003_petconnect.sql'), 'utf8');
  for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(value => value.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
}

module.exports = { ensurePetConnectSchema };
