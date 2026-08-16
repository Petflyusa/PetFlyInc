const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ensureQuoteSchema } = require('../lib/quote-database');

test('quote insert binds a value for every persisted column', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const quoteInsert = server.match(/INSERT INTO quote_requests\s*\(([^)]+)\)\s*VALUES \(([^)]+)\)/);

  assert.ok(quoteInsert, 'quote insert statement should exist');
  const columns = quoteInsert[1].split(',').map((column) => column.trim()).filter(Boolean);
  const placeholders = (quoteInsert[2].match(/\?/g) || []).length;

  assert.equal(placeholders, columns.length, 'every quote column needs a matching SQL placeholder');
});

test('adds missing quote fields without touching existing columns', async () => {
  const executed = [];
  const connection = {
    query: async (sql) => {
      executed.push(sql);
      if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) return [[{ COLUMN_NAME: 'contact_name' }, { COLUMN_NAME: 'email' }]];
      return [];
    }
  };

  await ensureQuoteSchema(connection);

  const alterStatements = executed.filter(sql => /^ALTER TABLE quote_requests ADD COLUMN/i.test(sql));
  assert.equal(alterStatements.length, 7);
  assert.match(alterStatements.join('\n'), /pet_color VARCHAR\(64\) NULL/i);
  assert.match(alterStatements.join('\n'), /pickup_delivery BOOLEAN NULL DEFAULT FALSE/i);
});

test('groups quote and contract under the services navigation menu', () => {
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style-v2.css'), 'utf8');

  assert.match(header, /class="services-nav-item/);
  assert.match(header, /class="services-submenu/);
  assert.match(header, /href="\/quote"/);
  assert.match(header, /href="\/contract"/);
  assert.match(styles, /\.services-submenu/);
});
