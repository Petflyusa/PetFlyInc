const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getSeoMetadata } = require('../lib/seo');

test('assigns a unique search title and service schema to the services page', () => {
  const seo = getSeoMetadata('/service', 'https://petflyinc.com');

  assert.match(seo.title, /International Pet Transport/i);
  assert.match(seo.description, /door-to-door/i);
  assert.equal(seo.schema['@type'], 'Service');
});

test('does not override PetConnect search metadata with a legacy template title', () => {
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');

  assert.doesNotMatch(registry, /pageTitle:/);
});

test('keeps private application areas out of crawler directives', () => {
  const robots = fs.readFileSync(path.join(__dirname, '..', 'public', 'robots.txt'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Disallow: \/portal\//);
  assert.match(robots, /Disallow: \/dashboard\//);
  assert.match(server, /X-Robots-Tag/);
});

test('publishes canonical social metadata and JSON-LD from the public header', () => {
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');

  assert.match(header, /property="og:title"/);
  assert.match(header, /name="twitter:card"/);
  assert.match(header, /application\/ld\+json/);
});
