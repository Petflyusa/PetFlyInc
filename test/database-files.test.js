const test = require('node:test');
const assert = require('node:assert/strict');
const { databaseFileUrl, storageKeyFromUrl } = require('../lib/database-files');

test('database-backed upload URLs round-trip only valid storage keys', () => {
  const key = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(databaseFileUrl(key), '/uploads/db/' + key);
  assert.equal(storageKeyFromUrl('/uploads/db/' + key), key);
  assert.equal(storageKeyFromUrl('/uploads/pets/old-file.jpg'), null);
  assert.equal(storageKeyFromUrl('/uploads/db/../../etc/passwd'), null);
});
