const test = require('node:test');
const assert = require('node:assert/strict');

const { createContractNumber, canEditContract, blankContractData, calculateQuotationTotal, calculateBalance, normalizeContractData } = require('../lib/contracts');

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
