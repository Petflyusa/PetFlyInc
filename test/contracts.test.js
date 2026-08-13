const test = require('node:test');
const assert = require('node:assert/strict');

const { createContractNumber, canEditContract } = require('../lib/contracts');

test('creates a readable unique contract number', () => {
  assert.match(createContractNumber(new Date('2026-08-13T12:00:00Z'), 'abc123'), /^PF-20260813-ABC123$/);
});

test('does not allow a signed contract to be edited', () => {
  assert.equal(canEditContract('draft'), true);
  assert.equal(canEditContract('issued'), true);
  assert.equal(canEditContract('signed'), false);
});
