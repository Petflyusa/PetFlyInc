const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildVisit, shouldTrack } = require('../lib/visitor-analytics');

function request(overrides = {}) {
  return {
    method: 'GET',
    path: '/',
    headers: { accept: 'text/html', 'x-forwarded-for': '203.0.113.10', 'x-vercel-ip-country': 'CA', 'x-vercel-ip-city': 'Vancouver', referer: 'https://google.com' },
    socket: { remoteAddress: '127.0.0.1' },
    session: {},
    get(name) { return this.headers[name.toLowerCase()] || ''; },
    ...overrides
  };
}

test('tracks only public HTML page requests', () => {
  assert.equal(shouldTrack(request()), true);
  assert.equal(shouldTrack(request({ method: 'POST' })), false);
  assert.equal(shouldTrack(request({ path: '/api/countries' })), false);
  assert.equal(shouldTrack(request({ path: '/admin' })), false);
  assert.equal(shouldTrack(request({ headers: { accept: 'application/json' } })), false);
});

test('builds a privacy-conscious visit record with hashed visitor key and hosting location', () => {
  const visit = buildVisit(request({ session: { memberId: 42 } }), 'test-secret');
  assert.match(visit.visitorKey, /^[a-f0-9]{64}$/);
  assert.notEqual(visit.visitorKey, '203.0.113.10');
  assert.equal(visit.country, 'CA');
  assert.equal(visit.city, 'Vancouver');
  assert.equal(visit.accountType, 'member');
  assert.equal(visit.accountId, '42');
  assert.equal(visit.path, '/');
});

test('includes visitor analytics migration in startup migrations', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '011_visitor_analytics.sql'), 'utf8');
  const database = fs.readFileSync(path.join(__dirname, '..', 'lib', 'petconnect-database.js'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS visitor_visits/i);
  assert.match(database, /011_visitor_analytics\.sql/);
});

test('protects visitor analytics API and adds admin navigation entry', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin.ejs'), 'utf8');
  assert.match(server, /app\.get\('\/api\/admin\/analytics\/visitors', requireAdmin/);
  assert.match(admin, /data-section="analytics"/);
});
