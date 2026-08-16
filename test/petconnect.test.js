const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('PetConnect migration defines member and pet registry tables', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '003_petconnect.sql'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS members/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS registered_pets/i);
  assert.match(migration, /microchip_number VARCHAR\(32\)/i);
  assert.match(migration, /species ENUM\('Dog','Cat','Bird','Other'\)/i);
  assert.match(migration, /photo_filename VARCHAR\(255\)/i);
  assert.doesNotMatch(migration, /microchip_brand/);
});

test('PetConnect exposes member authentication and pet routes', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const registerView = fs.readFileSync(path.join(__dirname, '..', 'views', 'register.ejs'), 'utf8');
  const dashboardView = fs.readFileSync(path.join(__dirname, '..', 'views', 'petconnect-dashboard.ejs'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style-v2.css'), 'utf8');

  assert.match(server, /app\.get\('\/register'/);
  assert.match(server, /app\.post\('\/register'/);
  assert.match(server, /app\.post\('\/login'/);
  assert.match(server, /app\.get\('\/dashboard'/);
  assert.match(server, /app\.post\('\/api\/petconnect\/pets'/);
  assert.match(server, /microchip_number/);
  assert.match(registerView, /name="email"/);
  assert.match(dashboardView, /name="microchip_number"/);
  assert.match(dashboardView, /name="species"/);
  assert.match(dashboardView, /name="photos"/);
  assert.doesNotMatch(dashboardView, /microchip_brand/);
  assert.match(styles, /\.petconnect-hero \.btn-primary \{ width: auto; background: var\(--accent\);/);
});
