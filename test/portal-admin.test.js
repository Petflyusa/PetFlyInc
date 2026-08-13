const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('provides protected admin APIs for portal accounts and relocation records', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/portal-account', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/relocation-updates', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/documents', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/boarding-updates', requireAdmin/);
});
