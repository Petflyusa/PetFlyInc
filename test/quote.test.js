const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('quote insert binds a value for every persisted column', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const quoteInsert = server.match(/INSERT INTO quote_requests\s*\(([^)]+)\)\s*VALUES \(([^)]+)\)/);

  assert.ok(quoteInsert, 'quote insert statement should exist');
  const columns = quoteInsert[1].split(',').map((column) => column.trim()).filter(Boolean);
  const placeholders = (quoteInsert[2].match(/\?/g) || []).length;

  assert.equal(placeholders, columns.length, 'every quote column needs a matching SQL placeholder');
});
