const fs = require('fs');
const path = require('path');

async function ensurePetConnectSchema(connection) {
  for (const migration of ['003_petconnect.sql', '004_petconnect_alerts.sql', '005_petconnect_locations.sql', '006_petconnect_admin.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', migration), 'utf8');
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(value => value.trim()).filter(Boolean)) {
      try {
        await connection.query(statement);
      } catch (err) {
        // ALTER TABLE statements must remain safe when the process restarts.
        if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(err.code)) throw err;
      }
    }
  }
}

module.exports = { ensurePetConnectSchema };
