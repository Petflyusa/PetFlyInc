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
  assert.match(server, /function getSiteUrl\(\)/);
  assert.match(server, /if \(isLocalUrl\)/);
  assert.match(server, /app\.put\('\/api\/admin\/petconnect\/members\/:id'/);
  assert.match(server, /app\.delete\('\/api\/admin\/petconnect\/members\/:id'/);
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

test('PetConnect admin migration supports full member addresses and organization invitations', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '006_petconnect_admin.sql'), 'utf8');
  const database = fs.readFileSync(path.join(__dirname, '..', 'lib', 'petconnect-database.js'), 'utf8');

  assert.match(migration, /ALTER TABLE members ADD COLUMN address_line VARCHAR\(255\) NULL/i);
  assert.match(migration, /ALTER TABLE rescue_partners ADD COLUMN invitation_sent_at TIMESTAMP NULL/i);
  assert.match(migration, /ALTER TABLE rescue_partners ADD COLUMN invitation_expires_at TIMESTAMP NULL/i);
  assert.match(database, /006_petconnect_admin\.sql/);
});

test('PetConnect admin provides dashboard summaries and filtered dedicated data APIs', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.get\('\/api\/admin\/petconnect\/summary'/);
  assert.match(server, /req\.query\.verified/);
  assert.match(server, /req\.query\.missing/);
  assert.match(server, /req\.query\.alert_type/);
  assert.match(server, /req\.query\.partner_type_id/);
  assert.match(server, /address_line/);
  assert.match(server, /geocodeAddress\(\[addressLine, city, state, postalCode, country\]\)/);
});

test('Admin PetConnect uses dashboard and dedicated searchable workspaces', () => {
  const admin = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin.ejs'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  ['petconnect-overview', 'petconnect-members', 'petconnect-pets', 'petconnect-alerts', 'petconnect-partners'].forEach(section => assert.match(admin, new RegExp('section-' + section)));
  assert.match(admin, /PetConnect Overview/);
  assert.match(app, /loadPetConnectOverview/);
  assert.match(app, /loadPetConnectMembers/);
  assert.match(app, /loadPetConnectPartners/);
  assert.match(app, /previewPartnerCsv/);
  assert.match(app, /inviteSelectedPartners/);
});

test('PetConnect admins can preview CSV organizations and invite selected records', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/csv-preview'/);
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/csv-import'/);
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/invite'/);
  assert.match(server, /crypto\.randomBytes\(32\)\.toString\('hex'\)/);
  assert.match(server, /invitation_expires_at=DATE_ADD\(NOW\(\), INTERVAL 14 DAY\)/);
  assert.match(server, /sendEmail\(partner\.email/);
});

test('PetConnect organization API supports paged geographic management', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /req\.query\.per_page/);
  assert.match(server, /COUNT\(\*\) AS total/);
  assert.match(server, /pagination: \{ page, perPage, total/);
  assert.match(server, /rp\.geocode_status/);
  assert.match(server, /req\.query\.geocode_status/);
});

test('Organizations workspace provides page controls, geographic status, and page selection', () => {
  const admin = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin.ejs'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  assert.match(admin, /id="pcPartnerPerPage"/);
  assert.match(admin, /id="pcPartnerGeoStatus"/);
  assert.match(admin, /id="partnerPagination"/);
  assert.match(app, /toggleAllPetConnectPartners/);
  assert.match(app, /retrySelectedPartnerGeocoding/);
  assert.match(app, /pcPartnerGeo/);
});

test('large organization CSVs are reviewed and imported as uploaded files', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  assert.match(server, /fileSize: 10 \* 1024 \* 1024/);
  assert.match(server, /rows: rows\.slice\(0, 100\)/);
  assert.match(server, /partnerCsvUpload\.single\('file'\)/);
  assert.match(admin, /form\.append\('file',input\.files\[0\]\)/);
  assert.match(admin, /Import all valid organizations/);
});

test('PetConnect relays public microchip finder contacts without exposing owner details', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');
  const registryRoute = server.match(/app\.get\('\/registry',[\s\S]*?\n\}\);/);

  assert.ok(registryRoute, 'GET /registry route should exist');
  assert.match(registryRoute[0], /req\.query\.microchip/);
  assert.match(server, /app\.post\('\/registry\/microchip-contact'/);
  assert.match(server, /sendEmail\(pet\.owner_email/);
  assert.match(registry, /name="microchip"/);
  assert.match(registry, /name="finder_name"/);
  assert.match(registry, /name="message"/);
  assert.doesNotMatch(registry, /owner_email/);
  assert.doesNotMatch(registry, /owner_phone/);
});

test('admin can diagnose and send a bounded SMTP delivery test', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');

  assert.match(server, /app\.get\('\/api\/admin\/email-health'/);
  assert.match(server, /app\.post\('\/api\/admin\/email-test'/);
  assert.match(server, /mailTransporter\.verify\(\)/);
  assert.match(admin, /testEmailDelivery/);
  assert.match(admin, /emailHealthStatus/);
  assert.match(admin, /editPetConnectMember/);
  assert.match(admin, /deletePetConnectMember/);
});
