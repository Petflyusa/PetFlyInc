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
  const clientDetailRoute = server.slice(server.indexOf("app.get('/api/portal/relocations/:contractId'"), server.indexOf('// ── PUBLIC API'));

  assert.match(clientDetailRoute, /FROM client_contracts cc JOIN contracts c ON c\.id=cc\.contract_id/);
  assert.match(clientDetailRoute, /WHERE cc\.client_account_id=\?/);
  assert.match(clientDetailRoute, /SELECT id, status_step, client_note, occurred_at FROM relocation_updates/);
  assert.doesNotMatch(clientDetailRoute, /SELECT[^;]*internal_note[^;]*FROM relocation_updates/);
});

test('hardens authentication and sensitive state-changing endpoints', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /function allowAuthAttempt\(req, formName, limit = 10\)/);
  assert.match(server, /function rotateSession\(req, values\)/);
  assert.match(server, /allowAuthAttempt\(req, 'admin-login'\)/);
  assert.match(server, /allowAuthAttempt\(req, 'member-login'\)/);
  assert.match(server, /allowAuthAttempt\(req, 'portal-login'\)/);
  assert.match(server, /allowAuthAttempt\(req, 'partner-login'\)/);
  assert.match(server, /rotateSession\(req, \{ adminId: admin\.id, adminUsername: admin\.username \}\)/);
  assert.match(server, /rotateSession\(req, \{ memberId: member\.id, memberEmail: member\.email \}\)/);
  assert.match(server, /allowPublicForm\(req, 'contract-sign', 5\)/);
  assert.match(server, /res\.set\('Permissions-Policy', 'camera=\(\), microphone=\(\), geolocation=\(\)'\)/);
  assert.match(server, /referrerPolicy: \{ policy: 'strict-origin-when-cross-origin' \}/);
  assert.match(server, /frameguard: \{ action: 'deny' \}/);
});
