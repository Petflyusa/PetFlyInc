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
  assert.match(server, /app\.post\('\/resend-verification'/);
  assert.match(server, /connectionTimeout: 10000/);
  assert.match(server, /microchip_number/);
  assert.match(registerView, /name="email"/);
  assert.match(dashboardView, /name="microchip_number"/);
  assert.match(dashboardView, /name="species"/);
  assert.match(dashboardView, /name="photos"/);
  assert.doesNotMatch(dashboardView, /microchip_brand/);
  assert.match(styles, /\.petconnect-hero \.btn-primary \{ width: auto; background: var\(--accent\);/);
});

test('PetConnect alerts and rescue partner migration is available at startup', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '004_petconnect_alerts.sql'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS partner_types/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS rescue_partners/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS missing_alerts/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS alert_notifications/i);
  assert.match(server, /app\.post\('\/dashboard\/missing\/new'/);
  assert.match(server, /app\.get\('\/alert\/:id'/);
  assert.match(server, /app\.get\('\/partners'/);
  assert.match(server, /app\.post\('\/partner\/register'/);
  assert.match(server, /app\.post\('\/partner\/login'/);
  assert.match(server, /app\.get\('\/api\/globe\/data'/);
});

test('PetConnect completes public alerts, member locations, and administrator management', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '005_petconnect_locations.sql'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');

  assert.match(migration, /ADD COLUMN latitude DECIMAL\(10,8\)/i);
  assert.match(migration, /verify_token_expires_at/i);
  assert.match(server, /app\.get\('\/alert\/:id'/);
  assert.match(server, /app\.get\('\/api\/admin\/petconnect\/members'/);
  assert.match(server, /app\.get\('\/api\/admin\/petconnect\/partners'/);
  assert.match(server, /app\.get\('\/api\/admin\/petconnect\/alerts'/);
  assert.match(registry, /name="species"/);
  assert.match(registry, /petconnect-globe/);
  assert.match(admin, /PetConnect/);
});

test('admin can diagnose and send a bounded SMTP delivery test', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');

  assert.match(server, /app\.get\('\/api\/admin\/email-health'/);
  assert.match(server, /app\.post\('\/api\/admin\/email-test'/);
  assert.match(server, /mailTransporter\.verify\(\)/);
  assert.match(admin, /testEmailDelivery/);
});
