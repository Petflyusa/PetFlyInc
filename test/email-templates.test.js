const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const templates = require('../lib/email-templates');
const { quoteConfirmation, memberVerification } = templates;

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

test('all fixed email templates render a branded HTML and text message', () => {
  const siteUrl = 'https://petflyinc.com';
  const link = `${siteUrl}/example`;
  const messages = [
    templates.contactConfirmation({ name: 'Ava', siteUrl }),
    templates.contractSigned({ contractNumber: 'PF-DEMO-1001', siteUrl }),
    templates.finderMessage({ petName: 'Milo', finderName: 'Lee', finderEmail: 'lee@example.com', finderPhone: '', message: 'I found Milo.', siteUrl }),
    templates.lostFoundAlert({ petName: 'Milo', alertType: 'lost', location: 'Los Angeles, CA', alertUrl: link, siteUrl }),
    templates.partnerVerification({ claimUrl: link, siteUrl }),
    templates.partnerInvitation({ organizationName: 'Care Clinic', claimUrl: link, siteUrl }),
    templates.portalAccess({ loginUrl: link, initialPassword: 'temporary-password', siteUrl }),
    templates.internalQuoteNotification({ name: 'Ava', email: 'ava@example.com', details: [['Pet', 'Milo']], siteUrl }),
    templates.internalContactNotification({ name: 'Ava', email: 'ava@example.com', subject: 'Question', message: 'Please call.', siteUrl }),
    templates.smtpTest({ siteUrl })
  ];
  for (const email of messages) {
    assert.ok(email.subject);
    assert.match(email.html, /Pet Fly Inc/);
    assert.ok(email.text);
  }
});

test('partner invitation explains the free local lost-and-found service', () => {
  const email = templates.partnerInvitation({ organizationName: 'Care Clinic', claimUrl: 'https://petflyinc.com/partner/claim/example', siteUrl: 'https://petflyinc.com' });
  assert.match(email.subject, /reunite lost pets/i);
  assert.match(email.html, /no platform fees or subscription charges/i);
  assert.match(email.html, /nearby missing-pet alerts/i);
  assert.match(email.html, /post a found-pet alert/i);
  assert.match(email.html, /Join PetConnect for free/i);
});
