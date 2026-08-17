const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { quoteConfirmation, memberVerification } = require('../lib/email-templates');

test('quote confirmation uses branded, safe email content', () => {
  const email = quoteConfirmation({
    name: 'Ava <Smith>',
    siteUrl: 'https://petflyinc.com'
  });

  assert.equal(email.subject, 'We received your Pet Fly Inc quote request');
  assert.match(email.html, /https:\/\/petflyinc\.com\/images\/petfly-email-logo\.png/);
  assert.match(email.html, /Ava &lt;Smith&gt;/);
  assert.match(email.html, /spam or junk/i);
  assert.match(email.text, /Ava <Smith>/);
});

test('member verification includes its action link in HTML and text', () => {
  const verifyUrl = 'https://petflyinc.com/member/verify?token=abc123';
  const email = memberVerification({
    name: 'Ava',
    siteUrl: 'https://petflyinc.com/',
    verifyUrl
  });

  assert.match(email.html, /href="https:\/\/petflyinc\.com\/member\/verify\?token=abc123"/);
  assert.match(email.text, /https:\/\/petflyinc\.com\/member\/verify\?token=abc123/);
});

test('publishes the email header logo asset', () => {
  const logoPath = path.join(__dirname, '..', 'public', 'images', 'petfly-email-logo.png');

  assert.ok(fs.existsSync(logoPath), 'email header logo should be publicly available');
  assert.ok(fs.statSync(logoPath).size > 0, 'email header logo should not be empty');
});
