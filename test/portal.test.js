const test = require('node:test');
const assert = require('node:assert/strict');

const { relocationSteps, documentCategories, documentExpiryStatus, normalizeYouTubeUrl, isActiveRelocation } = require('../lib/portal');

test('uses the approved relocation status order', () => {
  assert.deepEqual(relocationSteps, ['Consulting', 'Contract Signed', 'Pick-Up', 'Exam/Vaccination', 'Documentation', 'On Route', 'In-Transfer', 'Home Delivery']);
});

test('uses every required document category', () => {
  assert.deepEqual(documentCategories, ['Rabies Vaccination', 'Other Vaccination', 'Exam Reports', 'Other Reports', 'Travel Documents', 'Other Documents', 'Client Identifications']);
});

test('classifies expired and soon-expiring documents', () => {
  assert.equal(documentExpiryStatus('2026-08-12', '2026-08-13'), 'expired');
  assert.equal(documentExpiryStatus('2026-09-01', '2026-08-13'), 'expiring');
  assert.equal(documentExpiryStatus('2026-12-01', '2026-08-13'), 'valid');
  assert.equal(documentExpiryStatus('', '2026-08-13'), 'not_set');
});

test('normalizes supported YouTube URLs', () => {
  assert.equal(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(normalizeYouTubeUrl('https://example.com/video'), null);
});

test('treats completed delivery as inactive', () => {
  assert.equal(isActiveRelocation('On Route'), true);
  assert.equal(isActiveRelocation('Home Delivery'), false);
});
