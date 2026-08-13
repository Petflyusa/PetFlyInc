const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { defaultFooter } = require('../lib/site');

test('provides public footer details when database content is unavailable', () => {
  assert.deepEqual(defaultFooter(), {
    email: 'info@petflyinc.com',
    phone: '+1 (555) 123-4567',
    hours: 'Mon-Fri: 9AM - 6PM PST'
  });
});

test('admin login uses an external script so Helmet CSP allows submission', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin-login.ejs'), 'utf8');
  assert.doesNotMatch(template, /onsubmit=/);
  assert.match(template, /src="\/js\/admin-login\.js"/);
});
