const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { serviceLandingByPath } = require('../lib/service-landings');

const requiredPaths = [
  '/international-pet-transport',
  '/pet-transport-usa-to-china',
  '/pet-transport-china-to-usa',
  '/pet-air-cargo-transport'
];

test('defines four distinct, quote-ready international pet transport landing pages', () => {
  assert.deepEqual(Object.keys(serviceLandingByPath), requiredPaths);
  for (const route of requiredPaths) {
    const page = serviceLandingByPath[route];
    assert.ok(page.title);
    assert.ok(page.summary);
    assert.ok(page.steps.length >= 3);
    assert.ok(page.faqs.length >= 3);
  }
});

test('connects the service landing pages to the server, sitemap, and service page', () => {
  const root = path.join(__dirname, '..');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const services = fs.readFileSync(path.join(root, 'views', 'service.ejs'), 'utf8');

  assert.match(server, /app\.get\(Object\.keys\(serviceLandingByPath\)/);
  for (const route of requiredPaths) {
    assert.match(sitemap, new RegExp(route));
    assert.match(services, new RegExp(route));
  }
});
