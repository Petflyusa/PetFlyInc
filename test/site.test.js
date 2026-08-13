const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultFooter } = require('../lib/site');

test('provides public footer details when database content is unavailable', () => {
  assert.deepEqual(defaultFooter(), {
    email: 'info@petflyinc.com',
    phone: '+1 (555) 123-4567',
    hours: 'Mon-Fri: 9AM - 6PM PST'
  });
});
