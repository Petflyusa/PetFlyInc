const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createTtlCache } = require('../lib/ttl-cache');
const { createRateLimiter } = require('../lib/request-rate-limit');
const { nextEmailAttemptAt } = require('../lib/email-queue');

test('caches a value until its configured TTL expires', () => {
  let now = 1_000;
  const cache = createTtlCache({ now: () => now });
  cache.set('footer', { phone: '626-656-5666' }, 500);
  assert.deepEqual(cache.get('footer'), { phone: '626-656-5666' });
  now += 501;
  assert.equal(cache.get('footer'), undefined);
});

test('enforces a bounded request window per client and action', () => {
  let now = 1_000;
  const limiter = createRateLimiter({ now: () => now });
  assert.equal(limiter.allow('quote:127.0.0.1', 2, 60_000), true);
  assert.equal(limiter.allow('quote:127.0.0.1', 2, 60_000), true);
  assert.equal(limiter.allow('quote:127.0.0.1', 2, 60_000), false);
  now += 60_001;
  assert.equal(limiter.allow('quote:127.0.0.1', 2, 60_000), true);
});

test('backs off failed outbound email attempts without exceeding one hour', () => {
  const now = new Date('2026-09-09T00:00:00.000Z');
  assert.equal(nextEmailAttemptAt(1, now).toISOString(), '2026-09-09T00:01:00.000Z');
  assert.equal(nextEmailAttemptAt(7, now).toISOString(), '2026-09-09T01:00:00.000Z');
});

test('ships crawlable SEO resources and does not use the Google translation endpoint', () => {
  const root = path.join(__dirname, '..');
  const header = fs.readFileSync(path.join(root, 'views', 'partials', 'header.ejs'), 'utf8');
  const localization = fs.readFileSync(path.join(root, 'public', 'js', 'i18n.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

  assert.equal(fs.existsSync(path.join(root, 'public', 'robots.txt')), true);
  assert.equal(fs.existsSync(path.join(root, 'public', 'sitemap.xml')), true);
  assert.match(header, /rel="canonical"/);
  assert.doesNotMatch(header, /translatePage\(document\.body/);
  assert.doesNotMatch(localization, /clients5\.google\.com/);
  assert.doesNotMatch(server, /clients5\.google\.com/);
});

test('renders regulation data as text and reports failed API loading instead of leaving a spinner', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'regulations.ejs'), 'utf8');
  assert.match(view, /function escapeRegulationHtml/);
  assert.match(view, /\.catch\(function\(\)/);
  assert.match(view, /countries\.forEach\(function\(country\)/);
  assert.doesNotMatch(view, /fetch\('\/api\/countries'\)/);
});
