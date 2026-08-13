const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createContractNumber, canEditContract, blankContractData, calculateQuotationTotal, calculateBalance, mergeClientContractData, normalizeContractData } = require('../lib/contracts');

test('creates a readable unique contract number', () => {
  assert.match(createContractNumber(new Date('2026-08-13T12:00:00Z'), 'abc123'), /^PF-20260813-ABC123$/);
});

test('does not allow a signed contract to be edited', () => {
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
  assert.equal(merged.payment.payment_method, 'Zelle');
});

test('client contract editor has typed controls and locks quotation fields', () => {
  const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');

  assert.match(clientTemplate, /clientReadOnly/);
  assert.match(clientTemplate, /Shipping Method/);
  assert.match(clientTemplate, /weight_kg/);
  assert.match(clientTemplate, /clientInput\(data,'agreement','effective_date'.*'date'/);
  assert.doesNotMatch(clientTemplate, /kennel_size/);
});
