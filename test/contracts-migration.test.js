const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { contractDatabaseError, ensureContractSchema } = require('../lib/contract-database');

test('identifies a missing contracts table with a direct recovery message', () => {
  const result = contractDatabaseError({ code: 'ER_NO_SUCH_TABLE', sqlMessage: "Table 'petflyinc.contracts' doesn't exist" });

  assert.deepEqual(result, {
    status: 503,
    error: 'Contracts database table is missing. Run migrations/001_create_contracts.sql and restart the server.'
  });
});

test('does not mask unrelated database errors', () => {
  assert.equal(contractDatabaseError({ code: 'ER_ACCESS_DENIED_ERROR', message: 'Access denied' }), null);
});

test('includes an idempotent migration for the contracts table', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_create_contracts.sql'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS contracts/i);
  assert.match(migration, /contract_number VARCHAR\(32\) NOT NULL UNIQUE/i);
  assert.match(migration, /FOREIGN KEY \(quote_request_id\)\s+REFERENCES quote_requests\(id\)\s+ON DELETE SET NULL/i);
});

test('applies the contract migration through the provided database connection', async () => {
  let executedSql;
  await ensureContractSchema({ query: async sql => { executedSql = sql; } });

  assert.match(executedSql, /CREATE TABLE IF NOT EXISTS contracts/i);
});
