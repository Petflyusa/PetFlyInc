const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('exposes portal login and requires an initial password change', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /app\.post\('\/portal\/login'/);
  assert.match(server, /must_change_password/);
  assert.match(server, /requirePortalAccount/);
  assert.match(server, /app\.post\('\/portal\/change-password'/);
});

test('points public client login links to the portal', () => {
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');

  assert.match(header, /href="\/portal\/login"/);
});

test('scopes portal relocation queries to the signed-in account and omits internal notes', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /FROM client_contracts cc JOIN contracts c ON c\.id=cc\.contract_id/);
  assert.match(server, /WHERE cc\.client_account_id=\?/);
  assert.match(server, /SELECT id, status_step, client_note, occurred_at FROM relocation_updates/);
  assert.doesNotMatch(server, /SELECT[^;]*internal_note[^;]*FROM relocation_updates/);
});
