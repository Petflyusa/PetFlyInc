const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');

test('public form notifications use the configurable notification inbox', () => {
  assert.match(server, /const notificationEmail = process\.env\.NOTIFICATION_EMAIL \|\| 'info@petflyinc\.com'/);
  assert.equal((server.match(/to: notificationEmail/g) || []).length, 3);
  assert.doesNotMatch(server, /queueEmail\(\{ to: 'info@petflyinc\.com'/);
  assert.match(envExample, /^NOTIFICATION_EMAIL=info@petflyinc\.com$/m);
});
