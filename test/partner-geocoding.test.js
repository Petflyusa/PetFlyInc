const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  GEOCODE_STATUSES,
  isValidCoordinates,
  isRetryableGeocode,
  nextGeocodeStatus
} = require('../lib/partner-geocoding');

test('accepts only valid latitude and longitude pairs', () => {
  assert.equal(isValidCoordinates({ latitude: 34.05, longitude: -118.24 }), true);
  assert.equal(isValidCoordinates({ latitude: 95, longitude: -118.24 }), false);
  assert.equal(isValidCoordinates({ latitude: 34.05, longitude: null }), false);
});

test('classifies geocoding results and bounded retries', () => {
  assert.deepEqual(GEOCODE_STATUSES, { pending: 'pending', located: 'located', failed: 'failed', needsReview: 'needs_review' });
  assert.equal(nextGeocodeStatus({ coordinates: { latitude: 1, longitude: 2 }, attempts: 1, maxAttempts: 3 }), 'located');
  assert.equal(nextGeocodeStatus({ coordinates: null, attempts: 1, maxAttempts: 3 }), 'needs_review');
  assert.equal(nextGeocodeStatus({ error: 'provider timeout', attempts: 1, maxAttempts: 3 }), 'pending');
  assert.equal(nextGeocodeStatus({ error: 'provider timeout', attempts: 3, maxAttempts: 3 }), 'failed');
  assert.equal(isRetryableGeocode('pending'), true);
  assert.equal(isRetryableGeocode('needs_review'), true);
  assert.equal(isRetryableGeocode('located'), false);
});

test('runs pending organization geocoding outside admin import requests', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /function processPartnerGeocodeQueue\(\)/);
  assert.match(server, /geocode_status='pending'/);
  assert.match(server, /schedulePartnerGeocodeWorker\(processed \? 1000 : 60000\)/);
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/geocode-retry'/);
});
