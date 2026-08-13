const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createContractNumber, canEditContract, blankContractData, calculateQuotationTotal, calculateBalance, mergeClientContractData, normalizeContractData } = require('../lib/contracts');

test('creates a readable unique contract number', () => {
  assert.match(createContractNumber(new Date('2026-08-13T12:00:00Z'), 'abc123'), /^PF-20260813-ABC123$/);
});

test('does not allow a signed contract to be signed again by a client', () => {
  assert.equal(canEditContract('draft'), true);
  assert.equal(canEditContract('issued'), true);
  assert.equal(canEditContract('signed'), false);
});

test('uses the supplied date as the contract effective date', () => {
  assert.equal(blankContractData('2026-08-13').agreement.effective_date, '2026-08-13');
});

test('calculates quotation total and remaining balance from numeric input', () => {
  assert.equal(calculateQuotationTotal({ cargo_charge: '100', vaccination: '25.50', documentation: '' }), '125.50');
  assert.equal(calculateBalance('125.50', '50'), '75.50');
});

test('normalizes total and balance before contract persistence', () => {
  const data = normalizeContractData({ quotation: { cargo_charge: '80', vaccination: '20' }, payment: { deposit_amount: '25' } }, '2026-08-13');
  assert.equal(data.quotation.total_cost, '100.00');
  assert.equal(data.payment.balance_amount, '75.00');
});

test('admin contract editor provides typed options and calculated pricing', () => {
  const adminScript = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');

  assert.match(adminScript, /Feline.*Canine.*Reptile.*Birds.*Other/);
  assert.match(adminScript, /Female Spayed.*Male Neutered.*Female Intact.*Male Intact/);
  assert.match(adminScript, /WeChat RMB.*Alipay RMB.*Bank Transfer RMB.*Zelle.*Wire/);
  assert.match(adminScript, /calculateAdminContractTotals/);
  assert.match(adminScript, /weight_kg/);
  assert.doesNotMatch(adminScript, /kennel_size/);
});

test('keeps admin quotation and payment values when client data is merged', () => {
  const stored = normalizeContractData({ quotation: { cargo_charge: '100' }, payment: { payment_method: 'Wire', deposit_amount: '25' } }, '2026-08-13');
  const merged = mergeClientContractData(stored, { client: { first_name: 'Avery' }, quotation: { cargo_charge: '0' }, payment: { payment_method: 'Zelle' } });

  assert.equal(merged.client.first_name, 'Avery');
  assert.equal(merged.quotation.cargo_charge, '100');
  assert.equal(merged.payment.payment_method, 'Wire');
});

test('client contract editor has typed controls and locks quotation fields', () => {
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');

  assert.match(clientTemplate, /clientReadOnly/);
  assert.match(clientTemplate, /Shipping Method/);
  assert.match(clientTemplate, /weight_kg/);
  assert.match(clientTemplate, /clientInput\(data,'agreement','effective_date'.*'date'/);
  assert.doesNotMatch(clientTemplate, /kennel_size/);
});

test('uses normal editable travel text fields without a location catalog dependency', () => {
  const adminApp = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');

  for (const source of [adminApp, clientTemplate]) {
    assert.match(source, /departure_country/);
    assert.match(source, /departure_state/);
    assert.match(source, /departure_city/);
    assert.match(source, /arrival_country/);
    assert.match(source, /arrival_state/);
    assert.match(source, /arrival_city/);
    assert.doesNotMatch(source, /\/api\/contract-locations/);
  }
});

test('locks payment and carrier details for client contracts and uses current carrier defaults', () => {
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');
  const defaults = blankContractData('2026-08-13');

  assert.match(clientTemplate, /clientReadOnly = \{ quotation:true, payment:true, carrier:true \}/);
  assert.equal(defaults.carrier.website, 'www.petflyinc.com');
  assert.equal(defaults.carrier.office_phone, '626-656-5666');
  assert.equal(defaults.carrier.representative_signature, undefined);
});

test('uses the same three-column width for every travel detail row', () => {
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');

  assert.match(clientTemplate, /\.contract-schedule \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); \}/);
  assert.doesNotMatch(clientTemplate, /\.contract-schedule \{[^}]*max-width/);
});

test('emails the signed contract number and PDF attachment to the client', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /generateContractPdf/);
  assert.match(server, /sendEmail\(clientEmail, `Your signed Pet Fly contract \$\{contractNumber\}`/);
  assert.match(server, /filename: `Pet-Fly-Contract-\$\{contractNumber\}\.pdf`/);
  assert.match(server, /attachments/);
  assert.match(server, /email_sent: emailSent/);
});

test('keeps signed contracts editable in the admin editor and admin API', () => {
  const adminScript = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.doesNotMatch(adminScript, /var locked = contract\.status === 'signed'/);
  assert.doesNotMatch(server, /app\.put\('\/api\/admin\/contracts\/:id'[\s\S]*?Signed contracts are immutable\./);
  assert.doesNotMatch(server, /app\.post\('\/api\/admin\/contracts\/:id\/issue'[\s\S]*?Signed contracts are immutable\./);
});

test('supports admin pet photo uploads and client-side photo display', () => {
  const adminScript = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const defaults = blankContractData('2026-08-13');

  assert.deepEqual(defaults.animal.photos, []);
  assert.match(server, /app\.post\('\/api\/admin\/contract-photos', requireAdmin, contractPhotoUpload\.array\('photos', 5\)/);
  assert.match(server, /image\/jpeg/);
  assert.match(adminScript, /uploadContractPhotos/);
  assert.match(adminScript, /animal\.photos/);
  assert.match(clientTemplate, /animal\.photos/);
  assert.match(clientTemplate, /pet-photo-gallery/);
});
