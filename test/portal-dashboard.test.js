const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renders relocation status, documents, and boarding updates in the dashboard', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'views', 'portal-dashboard.ejs'), 'utf8');

  assert.match(dashboard, /Consulting/);
  assert.match(dashboard, /Home Delivery/);
  assert.match(dashboard, /Rabies Vaccination/);
  assert.match(dashboard, /Client Identifications/);
  assert.match(dashboard, /youtube-nocookie\.com/);
  assert.match(dashboard, /pet-photo-gallery/);
});
